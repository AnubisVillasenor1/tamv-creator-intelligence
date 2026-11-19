# Skills e Integraciones — ISABELLA CERO v2.0

## Skills nativas

| Skill | Propósito | Estado |
|---|---|---|
| IV_Research | Investigación y validación de citas | Especificado |
| IV_MusicStudio | Composición y edición de audio | Implementado parcial |
| IV_VoiceStudio | Síntesis de voz con consentimiento | En investigación |
| IV_LegalResearch | Análisis jurídico | Especificado |
| IV_Bibliometrics | Análisis académico | Especificado |
| IV_OpenScience | Datos abiertos y reproducibilidad | Especificado |
| IV_Governance | Auditoría constitucional | Implementado parcial |
| IV_PromptEngineering | Optimización de instrucciones | Especificado |
| IV_Multimodal | Texto, imagen, audio, video | Especificado |
| IV_KnowledgeIngestion | Ingesta gobernada | Especificado |

## Skills externas integradas (skills.sh)

21 skills externas mapeadas a 10 skills nativas:

| Skill externa | Skill nativa | Riesgo |
|---|---|---|
| airunway-aks-setup | IV_Infrastructure | high |
| claude-handoff | IV_AgentHandoff | low |
| high-end-visual-design | IV_DesignSystem | low |
| entra-agent-id | IV_Identity | high |
| lark-approval | IV_Governance | medium |
| embedded-captions | IV_Multimodal | low |
| vercel-composition-patterns | IV_DesignSystem | low |
| pr-to-video | IV_Multimodal | low |
| video-edit | IV_Multimodal | medium |
| skill-creator | IV_PromptEngineering | low |
| brainstorming | IV_Creative | low |
| minimalist-ui | IV_DesignSystem | low |

## Regla de riesgo

- low → automático
- medium → verificación técnica
- high → aprobación CROWN humana

## Instalación

```bash
npx skills add https://github.com/microsoft/azure-skills --skill airunway-aks-setup
npx skills add https://github.com/mattpocock/skills --skill claude-handoff
```
