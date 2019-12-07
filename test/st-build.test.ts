import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import cdk = require('@aws-cdk/core');
import StBuild = require('../lib/st-build-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new StBuild.StBuildStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});