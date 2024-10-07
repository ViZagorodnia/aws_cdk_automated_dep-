## Task 2.2
Automated Deployment Web site link - djp9o2z86kcm0.cloudfront.net
Within folder \src\manual dep AWS CDK was created files needed to deploy through CDK API
Step by steps commands
 - mkdir infra
 - cd infra
 - cdk init app --language=typescript
 - npm run build
 - cdk ls
 - nano lib/infra-stack.ts and rename it to deploy-web-app-stack.ts
 - create a file called lib/deployment-service.ts
 - create and update file bin/infra.ts
 - inside infra run cdk synth
 - To bootstrap, run the following: cdk bootstrap aws://ACCOUNT-NUMBER/REGION
 - cdk deploy
DeployWebAppStack.deploymentViktoriiaBucketNameVS6734E508 = deploywebappstack-deploymentfrontendbucket67ceb713-dmeuplpxznej
DeployWebAppStack.deploymentViktoriiaCloudFrontURLVS4E6C47CA = djp9o2z86kcm0.cloudfront.net

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
