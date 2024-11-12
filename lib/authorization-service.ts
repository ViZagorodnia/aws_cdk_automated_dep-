import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { join } from 'path';

export class AuthorizationServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const username = process.env.TEST_USERNAME?.trim();
        const password = process.env.TEST_PASSWORD?.trim();
        const credentials = `${username}=${password}`;

        const basicAuthorizer = new lambda.Function(this, 'BasicAuthorizer', {
          runtime: lambda.Runtime.NODEJS_20_X,
          memorySize: 128,
          timeout: cdk.Duration.seconds(30),
          handler: "index.handler",
          code: lambda.Code.fromAsset(join(__dirname, "./lambda/basicAuthorizer")),
            environment: {
                CREDENTIALS: credentials
            }
        });

        new cdk.CfnOutput(this, 'BasicAuthorizerArn', {
            value: basicAuthorizer.functionArn,
            exportName: 'BasicAuthorizerArn'
        });
    }
}