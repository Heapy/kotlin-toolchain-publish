import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicationArguments, publicationEnvironment } from '../scripts/main.mjs';

test('defaults to a local bundle and makes dependency publication explicit', () => {
  assert.deepEqual(publicationArguments({}).args, ['package','--format','maven-central-bundle']);
  assert.deepEqual(publicationArguments({ INPUT_MODE:'publish', INPUT_REPOSITORY:'mavenLocal', INPUT_MODULES:'core,api' }).args, ['publish','mavenLocal','--module','core','--module','api','--non-transitive']);
  assert.deepEqual(publicationArguments({ INPUT_MODE:'publish', INPUT_MODULES:'core', INPUT_TRANSITIVE:'true' }).args, ['publish','mavenCentral','--module','core','--transitive']);
});
test('rejects invalid modes, repositories, and injected options', () => {
  for (const env of [{ INPUT_MODE:'release' }, { INPUT_REPOSITORY:'x;id' }, { INPUT_MODULES:'--help' }, { INPUT_REPOSITORY:'mavenLocal' }, { INPUT_TRANSITIVE:'yes' }]) assert.throws(() => publicationArguments(env));
});
test('maps credentials only into the child environment without mutating the caller', () => {
  const env = { INPUT_SIGNING_KEY:'private-key', INPUT_CENTRAL_PASSWORD:'password', KOTLIN_TOOLCHAIN_MAVEN_CENTRAL_USERNAME:'existing', PATH:'/bin' };
  const child = publicationEnvironment(env);
  assert.equal(child.KOTLIN_TOOLCHAIN_SIGNING_KEY, 'private-key');
  assert.equal(child.KOTLIN_TOOLCHAIN_MAVEN_CENTRAL_PASSWORD, 'password');
  assert.equal(child.KOTLIN_TOOLCHAIN_MAVEN_CENTRAL_USERNAME, 'existing');
  assert.equal(child.INPUT_SIGNING_KEY, undefined);
  assert.equal(env.KOTLIN_TOOLCHAIN_SIGNING_KEY, undefined);
});
