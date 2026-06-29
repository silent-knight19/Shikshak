import { CN_PROMPT } from './cn';
import { OS_PROMPT } from './os';
import { DB_PROMPT } from './db';
import { TOC_PROMPT } from './toc';
import { CD_PROMPT } from './cd';
import { COA_PROMPT } from './coa';
import { DS_PROMPT } from './ds';
import { ALGO_PROMPT } from './algo';
import { DL_PROMPT } from './dl';
import { DM_PROMPT } from './dm';
import { EM_PROMPT } from './em';
import { GATE_SYSTEM_PROMPT } from './base';
import { appendVisualiseAddon } from '../../utils/getSystemPrompt';

const PROMPT_MAP: Record<string, string> = {
  'Computer Networks': CN_PROMPT,
  'computer networks': CN_PROMPT,
  'CN': CN_PROMPT,
  'Operating Systems': OS_PROMPT,
  'operating systems': OS_PROMPT,
  'OS': OS_PROMPT,
  'Database Management Systems': DB_PROMPT,
  'database management systems': DB_PROMPT,
  'Databases': DB_PROMPT,
  'databases': DB_PROMPT,
  'DB': DB_PROMPT,
  'Theory of Computation': TOC_PROMPT,
  'theory of computation': TOC_PROMPT,
  'TOC': TOC_PROMPT,
  'Compiler Design': CD_PROMPT,
  'compiler design': CD_PROMPT,
  'CD': CD_PROMPT,
  'Computer Organization': COA_PROMPT,
  'computer organization': COA_PROMPT,
  'Computer Organization & Architecture': COA_PROMPT,
  'COA': COA_PROMPT,
  'Data Structures': DS_PROMPT,
  'data structures': DS_PROMPT,
  'DS': DS_PROMPT,
  'Algorithms': ALGO_PROMPT,
  'algorithms': ALGO_PROMPT,
  'ALGO': ALGO_PROMPT,
  'Digital Logic': DL_PROMPT,
  'digital logic': DL_PROMPT,
  'DL': DL_PROMPT,
  'Discrete Mathematics': DM_PROMPT,
  'discrete mathematics': DM_PROMPT,
  'DM': DM_PROMPT,
  'Engineering Mathematics': EM_PROMPT,
  'engineering mathematics': EM_PROMPT,
  'EM': EM_PROMPT,
};

/**
 * Build the system instruction for the AI tutor.
 * If subjectTags match a known subject, the corresponding specialized prompt is used.
 * Otherwise, the general GATE_SYSTEM_PROMPT is returned with a note about the tags.
 */
export function buildSystemInstruction(
  subjectTags: string[],
  visualiseMode = false,
): string {
  for (const tag of subjectTags) {
    const matched = PROMPT_MAP[tag];
    if (matched) {
      let prompt = matched;
      prompt = appendVisualiseAddon(prompt, visualiseMode);
      return prompt;
    }
  }
  // Fallback: general prompt
  let prompt = GATE_SYSTEM_PROMPT;
  if (subjectTags.length > 0) {
    prompt += `\n\nThe user has tagged this question under: ${subjectTags.join(', ')}. Focus your expertise accordingly.`;
  }
  prompt = appendVisualiseAddon(prompt, visualiseMode);
  return prompt;
}
