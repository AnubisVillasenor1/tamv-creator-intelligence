CREATE TABLE public.tamv_ai_projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), name text NOT NULL CHECK(length(name) BETWEEN 2 AND 120), use_case text NOT NULL CHECK(length(use_case) BETWEEN 20 AND 8000), config jsonb NOT NULL DEFAULT '{"requireConsent":true,"requireHumanApproval":true,"requireDisclosure":true}', version integer NOT NULL DEFAULT 1, approved_version integer, assessment jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tamv_ai_projects TO authenticated;
GRANT ALL ON public.tamv_ai_projects TO service_role;
ALTER TABLE public.tamv_ai_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_read ON public.tamv_ai_projects FOR SELECT TO authenticated USING(owner_id=auth.uid());
CREATE TABLE public.tamv_project_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.tamv_ai_projects(id), actor_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('project.created','configuration.changed','project.approved','assessment.generated','policy.evaluated')), policy_version text NOT NULL DEFAULT 'tamv.governance.v1', project_version integer NOT NULL, details jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tamv_project_audit TO authenticated;
GRANT ALL ON public.tamv_project_audit TO service_role;
ALTER TABLE public.tamv_project_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_audit_read ON public.tamv_project_audit FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.tamv_ai_projects p WHERE p.id=project_id AND p.owner_id=auth.uid()));
CREATE INDEX tamv_project_audit_project_time ON public.tamv_project_audit(project_id,created_at);
CREATE OR REPLACE FUNCTION public.tamv_project_action(p_action text, p_project_id uuid DEFAULT NULL, p_payload jsonb DEFAULT '{}', p_expected_version integer DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.tamv_ai_projects; event_kind text; event_data jsonb; uid uuid := auth.uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_action='create' THEN
  INSERT INTO public.tamv_ai_projects(owner_id,name,use_case) VALUES(uid,p_payload->>'name',p_payload->>'useCase') RETURNING * INTO p;
  event_kind:='project.created'; event_data:=jsonb_build_object('name',p.name,'config',p.config);
 ELSE
  SELECT * INTO p FROM public.tamv_ai_projects WHERE id=p_project_id AND owner_id=uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF p_expected_version IS DISTINCT FROM p.version THEN RAISE EXCEPTION 'Version conflict'; END IF;
  IF p_action='configure' THEN
   IF jsonb_typeof(p_payload->'config') IS DISTINCT FROM 'object' OR (p_payload->'config'->>'requireConsent') IS DISTINCT FROM 'true' OR (p_payload->'config'->>'requireDisclosure') IS DISTINCT FROM 'true' OR (p_payload->'config'->>'requireHumanApproval') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Core safeguards cannot be disabled'; END IF;
   event_data:=jsonb_build_object('before',p.config,'after',p_payload->'config');
   UPDATE public.tamv_ai_projects SET config=p_payload->'config', version=version+1,approved_version=NULL,assessment=NULL,updated_at=now() WHERE id=p.id RETURNING * INTO p;
   event_kind:='configuration.changed';
  ELSIF p_action='approve' THEN
   IF length(coalesce(p_payload->>'reason',''))<10 THEN RAISE EXCEPTION 'Approval reason required'; END IF;
   UPDATE public.tamv_ai_projects SET approved_version=version,updated_at=now() WHERE id=p.id RETURNING * INTO p;
   event_kind:='project.approved'; event_data:=jsonb_build_object('reason',p_payload->>'reason','scope','owner configuration approval; not TAMV certification');
  ELSIF p_action='assessment' THEN
   IF jsonb_typeof(p_payload->'assessment') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Assessment required'; END IF;
   UPDATE public.tamv_ai_projects SET assessment=p_payload->'assessment',updated_at=now() WHERE id=p.id RETURNING * INTO p;
   event_kind:='assessment.generated'; event_data:=p_payload-'assessment';
  ELSIF p_action='evaluate' THEN
   event_kind:='policy.evaluated'; event_data:=p_payload;
  ELSE RAISE EXCEPTION 'Unsupported action'; END IF;
 END IF;
 INSERT INTO public.tamv_project_audit(project_id,actor_id,kind,project_version,details) VALUES(p.id,uid,event_kind,p.version,event_data);
 RETURN to_jsonb(p);
END $$;
REVOKE ALL ON FUNCTION public.tamv_project_action(text,uuid,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tamv_project_action(text,uuid,jsonb,integer) TO authenticated;
