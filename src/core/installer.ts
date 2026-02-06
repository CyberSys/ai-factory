import path from 'path';
import { copyDirectory, getSkillsDir, ensureDir, listDirectories } from '../utils/fs.js';
import type { AiFactoryConfig } from './config.js';

export interface InstallOptions {
  projectDir: string;
  skillsDir: string;
  skills: string[];
  stack: string | null;
}

export async function installSkills(options: InstallOptions): Promise<string[]> {
  const { projectDir, skillsDir, skills, stack } = options;
  const installedSkills: string[] = [];

  const targetDir = path.join(projectDir, skillsDir);
  await ensureDir(targetDir);

  const packageSkillsDir = getSkillsDir();

  for (const skill of skills) {
    const sourceSkillDir = path.join(packageSkillsDir, skill);
    const targetSkillDir = path.join(targetDir, skill);

    try {
      await copyDirectory(sourceSkillDir, targetSkillDir);
      installedSkills.push(skill);
    } catch (error) {
      console.warn(`Warning: Could not install skill "${skill}": ${error}`);
    }
  }

  if (stack) {
    const templateDir = path.join(packageSkillsDir, '_templates', stack);
    try {
      const templateSkills = await listDirectories(templateDir);
      for (const templateSkill of templateSkills) {
        const sourceDir = path.join(templateDir, templateSkill);
        const targetSkillDir = path.join(targetDir, templateSkill);

        await copyDirectory(sourceDir, targetSkillDir);
        installedSkills.push(`${stack}/${templateSkill}`);
      }
    } catch {
      // Template not found, skip
    }
  }

  return installedSkills;
}

export async function getAvailableSkills(): Promise<string[]> {
  const packageSkillsDir = getSkillsDir();
  const dirs = await listDirectories(packageSkillsDir);
  return dirs.filter(dir => !dir.startsWith('_'));
}

export async function getAvailableTemplates(): Promise<string[]> {
  const templatesDir = path.join(getSkillsDir(), '_templates');
  return listDirectories(templatesDir);
}

export async function updateSkills(config: AiFactoryConfig, projectDir: string): Promise<string[]> {
  // Get all available base skills from package
  const availableSkills = await getAvailableSkills();

  // Get custom skills (template-generated or external) to preserve in config
  const customSkills = config.installedSkills.filter(s => s.includes('/'));

  // Install all available base skills (new + existing)
  const installedBaseSkills = await installSkills({
    projectDir,
    skillsDir: config.skillsDir,
    skills: availableSkills,
    stack: null,
  });

  // Return base skills + preserved custom skills
  return [...installedBaseSkills, ...customSkills];
}
