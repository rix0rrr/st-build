#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { StBuildStack } from '../lib/st-build-stack';

const app = new cdk.App();
new StBuildStack(app, 'StBuildStack');
