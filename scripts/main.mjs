import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { bool, names, executable, projectDirectory, run, requireToolchain, output, summary, escapeCommand } from './common.mjs';

export function publicationArguments(env) {
  const mode = env.INPUT_MODE || 'bundle';
  if (!['bundle', 'publish'].includes(mode)) throw new Error('mode must be bundle or publish');
  const repository = env.INPUT_REPOSITORY || 'mavenCentral';
  if (!/^[A-Za-z][A-Za-z0-9_.-]*$/.test(repository)) throw new Error('Invalid repository ID');
  const modules = names(env.INPUT_MODULES || '', 'modules');
  const transitive = bool(env.INPUT_TRANSITIVE ?? 'false', 'transitive');
  if (mode === 'bundle' && repository !== 'mavenCentral') throw new Error('Bundle mode requires repository: mavenCentral');
  const args = mode === 'bundle' ? ['package', '--format', 'maven-central-bundle'] : ['publish', repository];
  args.push(...modules.flatMap(name => ['--module', name]));
  if (mode === 'publish' && modules.length) args.push(transitive ? '--transitive' : '--non-transitive');
  return { mode, repository, args };
}
export function publicationEnvironment(env) {
  const child = { ...env };
  const inputs = {
    INPUT_CENTRAL_USERNAME: 'KOTLIN_TOOLCHAIN_MAVEN_CENTRAL_USERNAME',
    INPUT_CENTRAL_PASSWORD: 'KOTLIN_TOOLCHAIN_MAVEN_CENTRAL_PASSWORD',
    INPUT_SIGNING_KEY: 'KOTLIN_TOOLCHAIN_SIGNING_KEY',
    INPUT_SIGNING_PASSPHRASE: 'KOTLIN_TOOLCHAIN_SIGNING_KEY_PASSPHRASE',
  };
  for (const [input, target] of Object.entries(inputs)) {
    if (env[input]) child[target] = env[input];
    delete child[input];
  }
  return child;
}
export async function publish(env = process.env) {
  const plan = publicationArguments(env);
  const check = bool(env.INPUT_CHECK ?? 'true', 'check');
  bool(env.INPUT_UPLOAD ?? 'true', 'upload-artifacts');
  const cwd = await projectDirectory(env.INPUT_DIRECTORY, env);
  const cli = await executable(cwd, env);
  const child = publicationEnvironment(env);
  for (const key of ['KOTLIN_TOOLCHAIN_MAVEN_CENTRAL_USERNAME', 'KOTLIN_TOOLCHAIN_MAVEN_CENTRAL_PASSWORD', 'KOTLIN_TOOLCHAIN_SIGNING_KEY', 'KOTLIN_TOOLCHAIN_SIGNING_KEY_PASSPHRASE']) {
    if (child[key]) console.log(`::add-mask::${escapeCommand(child[key])}`);
  }
  requireToolchain(cli, cwd, child);
  if (check) {
    const checkEnv = { ...child };
    for (const key of Object.keys(checkEnv)) if (key.startsWith('KOTLIN_TOOLCHAIN_MAVEN_CENTRAL_') || key.startsWith('KOTLIN_TOOLCHAIN_SIGNING_')) delete checkEnv[key];
    if (run(cli, ['check', ...names(env.INPUT_MODULES || '', 'modules').flatMap(name => ['--module', name])], { cwd, env: checkEnv }).status) throw new Error('Checks failed; publication was not attempted');
  }
  const result = run(cli, plan.args, { cwd, env: child });
  await output('build-path', path.join(cwd, 'build'), env);
  await output('mode', plan.mode, env);
  await output('repository', plan.repository, env);
  await output('published', String(plan.mode === 'publish' && result.status === 0), env);
  await summary(`### Kotlin Toolchain publication\n\nMode: ${plan.mode}\n\nRepository: ${plan.repository}\n\nResult: **${result.status ? 'failed' : 'succeeded'}**\n\n${plan.mode === 'bundle' ? 'A local bundle was prepared; no repository upload was requested.' : 'The CLI publication command completed. Maven Central staging/release behavior follows module.yaml.'}\n`, env);
  if (result.status) throw new Error(`Kotlin Toolchain ${plan.mode} failed (exit ${result.status})`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  publish().catch(error => { console.error(error.message); process.exitCode = 1; });
}
