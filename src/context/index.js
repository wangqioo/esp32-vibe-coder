import { basePrompt } from './base'
import { lvglSkill } from './skills/lvgl'
import { audioSkill } from './skills/audio'
import { cameraSkill } from './skills/camera'
import { imuSkill } from './skills/imu'
import { wifiSkill } from './skills/wifi'
import { bleSkill } from './skills/ble'
import { sdcardSkill } from './skills/sdcard'
import { gpioSkill } from './skills/gpio'
import { speechSkill } from './skills/speech'
import { visionSkill } from './skills/vision'
import { handheldSkill } from './skills/handheld'

export const ALL_SKILLS = [
  lvglSkill,
  audioSkill,
  cameraSkill,
  imuSkill,
  wifiSkill,
  bleSkill,
  sdcardSkill,
  gpioSkill,
  speechSkill,
  visionSkill,
  handheldSkill,
]

// Build system prompt from base + selected skill ids
export function buildSystemPrompt(selectedSkillIds = []) {
  const skillPrompts = ALL_SKILLS
    .filter(s => selectedSkillIds.includes(s.id))
    .map(s => s.systemPrompt)
    .join('\n\n')
  return skillPrompts ? `${basePrompt}\n\n${skillPrompts}` : basePrompt
}

// Inject a new pitfall or usage snippet into a skill at runtime (self-evolution)
// Returns updated skill object (caller must persist to localStorage)
export function patchSkill(skillId, type, content) {
  const skill = ALL_SKILLS.find(s => s.id === skillId)
  if (!skill) return null
  const section = type === 'pitfall' ? '### Pitfalls' : '### Usage'
  const entry = `- ${content}`
  if (skill.systemPrompt.includes(section)) {
    skill.systemPrompt = skill.systemPrompt.replace(section, `${section}\n${entry}`)
  } else {
    skill.systemPrompt += `\n\n${section}\n${entry}`
  }
  return skill
}
