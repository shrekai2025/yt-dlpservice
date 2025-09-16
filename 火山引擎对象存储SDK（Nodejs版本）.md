火山引擎对象存储SDK（Nodejs版本）

Volcengine Object Storage(TOS) JS SDK
Install
yarn
yarn add @volcengine/tos-sdk
npm
npm i @volcengine/tos-sdk
Use JS SDK
Import

// use import
import { TosClient } from '@volcengine/tos-sdk';

// use require
const { TosClient } = require('@volcengine/tos-sdk');
Create a client

const client = new TosClient({
  accessKeyId: 'Your Access Key',
  accessKeySecret: 'Your Secret Key',
  region: 'cn-beijing',
  endpoint: 'endpoint',
});
More example, see test and example folder


# 详细说明————————————
## 安装 Node.js SDK
安装 SDK
TOS Node.js SDK 使用 NPM 进行管理，如果本地工程没有初始化 package.json，您可以运行以下命令初始化。

注意

TOS Node.js SDK 要求 Node.js 版本 ≥ 10。

npm init
在本地初始化 package.json 后，运行以下命令安装最新版 SDK。

// use npm
npm i @volcengine/tos-sdk

// use yarn
yarn add @volcengine/tos-sdk

## 初始化客户端（Node.js SDK）
初始化 TOSClient 实例之后，您才可以向 TOS 服务发送 HTTP/HTTPS 请求。本文介绍 Node.js SDK 的初始化方式。
TOS Node.js 客户端提供了一系列接口用来与 TOS 服务进行交互，用来管理桶和对象等 TOS 上的资源。初始化客户端时，需要带上 AccessKey ID、AccessKey Secret 和 Region 等信息。在初始化时，您可以设置建立连接超时时间、超时重试次数和最大空闲连接数量等可选参数。

前提条件
安装 SDK
获取 AKSK 信息

配置长期访问凭证
初始化 SDK 前，您需要先配置长期访问凭证。本章节介绍不同操作系统下配置长期访问凭证的操作步骤。
打开终端并执行以下命令打开文件。
sudo vim /etc/profile
在文件末尾添加 AKSK 信息。
export TOS_ACCESS_KEY=AKTPYmI1Z****
export TOS_SECRET_KEY=T1dJM01UU****
保存文件并退出。
执行以下命令生效配置信息。
source /etc/profile
执行以下命令验证配置信息。
echo $TOS_ACCESS_KEY
echo $TOS_SECRET_KEY
如果配置成功，则返回如下示例：

AKTPYmI1Z****
T1dJM01UU****


创建 TosClient
使用必选参数初始化
以下代码展示如何使用 TOS 域名等必选参数初始化 TosClient，包括 AccessKey ID、AccessKey Secret、Endpoint 和 Region。

说明

TOS 支持的 Region 及 Endpoint 信息，请参见地域及访问域名。
AKSK 信息可从环境变量获取，配置方式，请参见配置访问凭证。
// 导入 SDK, 当 TOS Node.JS SDK 版本小于 2.5.2 请把下方 TosClient 改成 TOS 导入
import { TosClient } from '@volcengine/tos-sdk';

// 创建客户端
const client = new TosClient({
  accessKeyId: process.env['TOS_ACCESS_KEY'], 
  accessKeySecret: process.env['TOS_SECRET_KEY'], 
  region: "Provide your region", // 填写 Bucket 所在地域。以华北2（北京)为例，则 "Provide your region" 填写为 cn-beijing。
  endpoint: "Provide your endpoint", // 填写域名地址
});
使用可选参数初始化
TOS Node.js SDK 提供了多个可选参数来自定义配置 TosClient，例如配置 STS，HTTP 请求超时时间，请求重试策略等。
以下代码展示如何自定义配置 TosClient 的 HTTP 连接超时时间，具体的配置场景，请参见下文的配置超时机制。
// 导入 SDK, 当 TOS Node.JS SDK 版本小于 2.5.2 请把下方 TosClient 改成 TOS 导入
import { TosClient } from '@volcengine/tos-sdk';

const connectionTimeout = 10000;

// 创建客户端
const client = new TosClient({
  accessKeyId: process.env['TOS_ACCESS_KEY'], 
  accessKeySecret: process.env['TOS_SECRET_KEY'], 
  region: "Provide your region", // 填写 Bucket 所在地域。以华北2（北京)为例，则 "Provide your region" 填写为 cn-beijing。
  endpoint: "Provide your endpoint", // 填写域名地址
  connectionTimeout,
});

console.log(client);
常见配置场景

配置超时机制
您可以在初始化 TosClient 时，通过添加可选参数配置网络请求的超时时间。目前 TOS Node.js SDK 提供了以下超时参数用于 HTTP 请求的超时配置：

requestTimeout：HTTP 请求超时时间，单位毫秒，默认值为 120000，即 120 秒。
connectionTimeout：建立 HTTP 连接的超时时间，单位毫秒，默认值为 10000，即 10 秒。
以下代码展示如何在初始化 TosClient 时配置超时时间。
// 导入 SDK, 当 TOS Node.JS SDK 版本小于 2.5.2 请把下方 TosClient 改成 TOS 导入
import { TosClient } from '@volcengine/tos-sdk';

const connectionTimeout = 10000;
const requestTimeout = 120000;

// 创建客户端
const client = new TosClient({
  accessKeyId: process.env['TOS_ACCESS_KEY'], 
  accessKeySecret: process.env['TOS_SECRET_KEY'], 
  region: "Provide your region", // 填写 Bucket 所在地域。以华北2（北京)为例，则 "Provide your region" 填写为 cn-beijing。
  endpoint: "Provide your endpoint", // 填写域名地址
  connectionTimeout,
  requestTimeout,
});

console.log(client);
配置重试策略
网络波动或短期 TOS 服务异常（例如返回 500 HTTP 状态码）等场景会导致请求 TOS 服务失败。针对此问题，SDK 内部提供了重试机制，根据设置的重试次数进行指数退避重试，默认重试次数为 3 次。
幂等操作的接口在失败后会使用指数退避策略进行重试，非幂接口则直接抛出对应异常。您可以在初始化 TosClient 时，添加可选参数配置重试次数。
以下代码展示如何设置 SDK 的重试次数。
// 导入 SDK, 当 TOS Node.JS SDK 版本小于 2.5.2 请把下方 TosClient 改成 TOS 导入
import { TosClient } from '@volcengine/tos-sdk';
// 设置最大重试次数为 3 次，可根据实际需要调整
const maxRetryCount = 3;

// 创建客户端
const client = new TOS({
  accessKeyId: process.env['TOS_ACCESS_KEY'], 
  accessKeySecret: process.env['TOS_SECRET_KEY'], 
  region: "Provide your region", // 填写 Bucket 所在地域。以华北2（北京)为例，则 "Provide your region" 填写为 cn-beijing。
  endpoint: "Provide your endpoint", // 填写域名地址
  maxRetryCount,
});
配置数据校验
TOS SDK 在上传或下载对象时默认关闭 CRC 数据校验，确保数据传输过程中的完整性。
您可以使用以下代码，开启 CRC 数据校验。
// 导入 SDK, 当 TOS Node.JS SDK 版本小于 2.5.2 请把下方 TosClient 改成 TOS 导入
import { TosClient } from '@volcengine/tos-sdk';

// 设置开启 CRC 数据校验,默认为 false
const enableCRC = true;

// 创建客户端
const client = new TosClient({
  accessKeyId: process.env['TOS_ACCESS_KEY'], 
  accessKeySecret: process.env['TOS_SECRET_KEY'], 
  region: "Provide your region", // 填写 Bucket 所在地域。以华北2（北京)为例，则 "Provide your region" 填写为 cn-beijing。
  endpoint: "Provide your endpoint", // 填写域名地址
  enableCRC,
});
初始化参数列表
参数

参数类型

是否必选

示例值

说明

accessKeyId

string

必选

AKTPYmI1Z****

Access Key ID，密钥 ID，默认值 null。

accessKeySecret

string

必选

T1dJM01UU****==

AccessKey Secret，私有访问密钥，默认值 null。

region

string

必选

cn-beijing

TOS 服务端所在地域，默认值 null。

endpoint

string

可选，为空时由 region 参数决定

tos-cn-beijing.volces.com

访问域名，为空时由 region 参数决定。

stsToken

string

可选

STSkeyJBY2NvdW50SW************

临时访问凭证中的安全令牌，默认值 null。

enableVerifySSL

boolean

可选

true

配置是否开启 SSL 证书校验，默认值为 False。

autoRecognizeContentType

boolean

可选

true

自动识别 MIME 类型，默认开启。

requestTimeout

number

可选

120000

HTTP 请求超时时间，单位毫秒，默认值为 120000。

connectionTimeout

number

可选

10000

建立连接超时时间，单位毫秒，默认值为 10000。

idleConnectionTime

number

可选

60000

连接池中空闲 HTTP 连接时间超过此参数的设定值，则关闭 HTTP 连接，单位：毫秒，默认值为 60000。

maxConnections

number

可选

1024

HTTP 连接池最大连接数，默认值为 1024。

maxRetryCount

number

可选

3

请求失败后的最大重试次数，默认值为 3。

proxyHost

string

可选

localhost

代理服务器的主机地址，当前只支持 HTTP 协议，默认值 null。

proxyPort

number

可选

8080

代理服务器的端口号。

enableCRC

boolean

可选

false

是否开启 CRC 校验，默认值 false。

isCustomDomain

boolean

可选

false

是否将桶名拼接到 Endpoint 前，通过虚拟主机域名的方式访问 TOS，取值说明如下：

true：不拼接。
false：拼接。
默认值为 false。

说明

通过自定义域名访问 TOS 时，需要设置 isCustomDomain 为 true。

## 普通上传（Node.js SDK）
普通上传是指通过 putObject 方法上传单个对象(Object)，支持上传字符串（字符流）、上传 Bytes（Bytes 流）、上传网络流和上传本地文件四种形式。

注意事项
上传对象前，您必须具有 tos:PutObject 权限，具体操作，请参见权限配置指南。
上传对象时，对象名必须满足一定规范，详细信息，请参见对象命名规范。
TOS 是面向海量存储设计的分布式对象存储产品，内部分区存储了对象索引数据。为横向扩展您上传对象和下载对象时的最大吞吐量和减小热点分区的概率，请您避免使用字典序递增的对象命名方式，详细信息，请参见性能优化。
如果桶中已经存在同名对象，则新对象会覆盖已有的对象。如果您的桶开启了版本控制，则会保留原有对象，并生成一个新版本号用于标识新上传的对象。

示例代码

上传字符串
您可以通过以下示例代码，使用 putObject 接口，上传字符串数据到 TOS 指定 example_dir 目录下的 example.txt 文件。
// 导入 SDK, 当 TOS Node.JS SDK 版本小于 2.5.2 请把下方 TosClient 改成 TOS 导入
import { TosClient, TosClientError, TosServerError } from '@volcengine/tos-sdk';

// 创建客户端
const client = new TosClient({
  accessKeyId: process.env['TOS_ACCESS_KEY'],
  accessKeySecret: process.env['TOS_SECRET_KEY'],
  region: "Provide your region", // 填写 Bucket 所在地域。以华北2（北京)为例，则 "Provide your region" 填写为 cn-beijing。
  endpoint: "Provide your endpoint", // 填写域名地址
});

function handleError(error) {
  if (error instanceof TosClientError) {
    console.log('Client Err Msg:', error.message);
    console.log('Client Err Stack:', error.stack);
  } else if (error instanceof TosServerError) {
    console.log('Request ID:', error.requestId);
    console.log('Response Status Code:', error.statusCode);
    console.log('Response Header:', error.headers);
    console.log('Response Err Code:', error.code);
    console.log('Response Err Msg:', error.message);
  } else {
    console.log('unexpected exception, message: ', error);
  }
}

async function main() {
  try {
    const bucketName = 'node-sdk-test-bucket';
    const objectName = 'example_dir/example.txt';
    // 上传对象
    await client.putObject({
      bucket: bucketName,
      key: objectName,
      // 将字符串 "Hello TOS" 上传到指定 example_dir 目录下的 example.txt
      body: Buffer.from('Hello TOS'),
    });

    // 查询刚刚上传对象的大小
    const { data } = await client.headObject({
      bucket: bucketName,
      key: objectName,
    });
    // object size: 9
    console.log('object size:', data['content-length']);
  } catch (error) {
    handleError(error);
  }
}

main();

上传网络流
您可以通过以下示例代码，使用 putObject 接口上传网络流数据到 TOS 指定 example_dir 目录下的 example.txt 文件。

// 导入 SDK, 当 TOS Node.JS SDK 版本小于 2.5.2 请把下方 TosClient 改成 TOS 导入
import { TosClient, TosClientError, TosServerError } from '@volcengine/tos-sdk';
import https from 'https';

// 创建客户端
const client = new TosClient({
  accessKeyId: process.env['TOS_ACCESS_KEY'],
  accessKeySecret: process.env['TOS_SECRET_KEY'],
  region: "Provide your region", // 填写 Bucket 所在地域。以华北2（北京)为例，则 "Provide your region" 填写为 cn-beijing。
  endpoint: "Provide your endpoint", // 填写域名地址
});

function handleError(error) {
  if (error instanceof TosClientError) {
    console.log('Client Err Msg:', error.message);
    console.log('Client Err Stack:', error.stack);
  } else if (error instanceof TosServerError) {
    console.log('Request ID:', error.requestId);
    console.log('Response Status Code:', error.statusCode);
    console.log('Response Header:', error.headers);
    console.log('Response Err Code:', error.code);
    console.log('Response Err Msg:', error.message);
  } else {
    console.log('unexpected exception, message: ', error);
  }
}

async function main() {
  try {
    const bucketName = 'node-sdk-test-bucket';
    const objectName = 'example_dir/example.txt';
    // 从网络流中获取数据
    const req = https.get('https://www.volcengine.com/');
    const res = await new Promise((resolve) => req.on('response', resolve));
    // 上传对象
    await client.putObject({
      bucket: bucketName,
      key: objectName,
      body: res,
    });

    // 查询刚刚上传对象的大小
    const { data } = await client.headObject({
      bucket: bucketName,
      key: objectName,
    });
    console.log('object size:', data['content-length']);
  } catch (error) {
    handleError(error);
  }
}

main();

上传本地文件流
您可以通过以下示例代码，使用 putObject 接口，将指定路径上的文件上传到 TOS 指定 example_dir 目录下的 example.txt 文件。

// 导入 SDK, 当 TOS Node.JS SDK 版本小于 2.5.2 请把下方 TosClient 改成 TOS 导入
import { TosClient, TosClientError, TosServerError } from '@volcengine/tos-sdk';
import fs from 'fs';

// 创建客户端
const client = new TosClient({
  accessKeyId: process.env['TOS_ACCESS_KEY'],
  accessKeySecret: process.env['TOS_SECRET_KEY'],
  region: "Provide your region", // 填写 Bucket 所在地域。以华北2（北京)为例，则 "Provide your region" 填写为 cn-beijing。
  endpoint: "Provide your endpoint", // 填写域名地址
});

function handleError(error) {
  if (error instanceof TosClientError) {
    console.log('Client Err Msg:', error.message);
    console.log('Client Err Stack:', error.stack);
  } else if (error instanceof TosServerError) {
    console.log('Request ID:', error.requestId);
    console.log('Response Status Code:', error.statusCode);
    console.log('Response Header:', error.headers);
    console.log('Response Err Code:', error.code);
    console.log('Response Err Msg:', error.message);
  } else {
    console.log('unexpected exception, message: ', error);
  }
}

async function main() {
  try {
    const bucketName = 'node-sdk-test-bucket';
    const objectName = 'example_dir/example.txt';
    // 读取本地文件数据
    const body = fs.createReadStream('./example.txt');
    // 上传对象
    await client.putObject({
      bucket: bucketName,
      key: objectName,
      body,
    });

    // 查询刚刚上传对象的大小
    const { data } = await client.headObject({
      bucket: bucketName,
      key: objectName,
    });
    console.log('object size:', data['content-length']);
  } catch (error) {
    handleError(error);
  }
}

main();

从本地文件上传
您可以通过以下示例代码，使用 putObjectFromFile 接口，通过指定文件路径将文件上传到 TOS 指定 example_dir 目录下的 example.txt 文件。

// 导入 SDK, 当 TOS Node.JS SDK 版本小于 2.5.2 请把下方 TosClient 改成 TOS 导入
import { TosClient, TosClientError, TosServerError } from '@volcengine/tos-sdk';
import fs from 'fs';

// 创建客户端
const client = new TosClient({
  accessKeyId: process.env['TOS_ACCESS_KEY'],
  accessKeySecret: process.env['TOS_SECRET_KEY'],
  region: "Provide your region", // 填写 Bucket 所在地域。以华北2（北京)为例，则 "Provide your region" 填写为 cn-beijing。
  endpoint: "Provide your endpoint", // 填写域名地址
});

function handleError(error) {
  if (error instanceof TosClientError) {
    console.log('Client Err Msg:', error.message);
    console.log('Client Err Stack:', error.stack);
  } else if (error instanceof TosServerError) {
    console.log('Request ID:', error.requestId);
    console.log('Response Status Code:', error.statusCode);
    console.log('Response Header:', error.headers);
    console.log('Response Err Code:', error.code);
    console.log('Response Err Msg:', error.message);
  } else {
    console.log('unexpected exception, message: ', error);
  }
}

async function main() {
  try {
    const bucketName = 'node-sdk-test-bucket';
    const objectName = 'example_dir/example.txt';

    // 直接使用文件路径上传文件
    await client.putObjectFromFile({
      bucket: bucketName,
      key: objectName,
      filePath: './example.txt',
    });

    // 查询刚刚上传对象的大小
    const { data } = await client.headObject({
      bucket: bucketName,
      key: objectName,
    });
    console.log('object size:', data['content-length']);
  } catch (error) {
    handleError(error);
  }
}

main();

上传时设置对象元数据信息
您可以通过以下示例代码，使用 putObject 接口，上传字符串数据到指定 example_dir 目录下的 example.txt 文件，上传时指定对象存储类型为低频存储，权限为私有同时设置上传文件元数据信息。

// 导入 SDK, 当 TOS Node.JS SDK 版本小于 2.5.2 请把下方 TosClient 改成 TOS 导入
import { ACLType, StorageClassType, TosClient, TosClientError, TosServerError } from '@volcengine/tos-sdk';

// 创建客户端
const client = new TosClient({
  accessKeyId: process.env['TOS_ACCESS_KEY'],
  accessKeySecret: process.env['TOS_SECRET_KEY'],
  region: "Provide your region", // 填写 Bucket 所在地域。以华北2（北京)为例，则 "Provide your region" 填写为 cn-beijing。
  endpoint: "Provide your endpoint", // 填写域名地址
});

function handleError(error) {
  if (error instanceof TosClientError) {
    console.log('Client Err Msg:', error.message);
    console.log('Client Err Stack:', error.stack);
  } else if (error instanceof TosServerError) {
    console.log('Request ID:', error.requestId);
    console.log('Response Status Code:', error.statusCode);
    console.log('Response Header:', error.headers);
    console.log('Response Err Code:', error.code);
    console.log('Response Err Msg:', error.message);
  } else {
    console.log('unexpected exception, message: ', error);
  }
}

async function main() {
  try {
    const bucketName = 'node-sdk-test-bucket';
    const objectName = 'example_dir/example.txt';
    // 上传对象
    await client.putObject({
      bucket: bucketName,
      key: objectName,
      // 将字符串 "Hello TOS" 上传到指定 example_dir 目录下的 example.txt
      body: Buffer.from('Hello TOS'),
      // 指定存储类型为低频存储
      storageClass: StorageClassType.StorageClassIa,
      // 指定对象权限为私有
      acl: ACLType.ACLPrivate,
      // 用户自定义元数据信息
      meta: {
        key: 'value',
      },
    });

    // 查询刚刚上传的对象
    const { data } = await client.headObject({
      bucket: bucketName,
      key: objectName,
    });
    console.log('object size:', data['content-length']);
    console.log('storage class:', data['x-tos-storage-class']);
    console.log('x-tos-meta-key:', data['x-tos-meta-key']);
  } catch (error) {
    handleError(error);
  }
}

main();

配置进度条
上传时可通过 dataTransferStatusChange 参数处理上传进度，代码示例如下。

// 导入 SDK, 当 TOS Node.JS SDK 版本小于 2.5.2 请把下方 TosClient 改成 TOS 导入
import { DataTransferType, TosClient, TosClientError, TosServerError } from '@volcengine/tos-sdk';

// 创建客户端
const client = new TosClient({
  accessKeyId: process.env['TOS_ACCESS_KEY'],
  accessKeySecret: process.env['TOS_SECRET_KEY'],
  region: "Provide your region", // 填写 Bucket 所在地域。以华北2（北京)为例，则 "Provide your region" 填写为 cn-beijing。
  endpoint: "Provide your endpoint", // 填写域名地址
});

function handleError(error) {
  if (error instanceof TosClientError) {
    console.log('Client Err Msg:', error.message);
    console.log('Client Err Stack:', error.stack);
  } else if (error instanceof TosServerError) {
    console.log('Request ID:', error.requestId);
    console.log('Response Status Code:', error.statusCode);
    console.log('Response Header:', error.headers);
    console.log('Response Err Code:', error.code);
    console.log('Response Err Msg:', error.message);
  } else {
    console.log('unexpected exception, message: ', error);
  }
}

async function main() {
  try {
    const bucketName = 'node-sdk-test-bucket';
    const objectName = 'example_dir/example.txt';
    // 上传对象
    await client.putObject({
      bucket: bucketName,
      key: objectName,
      // 将字符串 "Hello TOS" 上传到指定 example_dir 目录下的 example.txt
      body: Buffer.from('Hello TOS'),
      // 通过自定义方式设置回调函数查看上传进度
      dataTransferStatusChange: (event) => {
        if (event.type === DataTransferType.Started) {
          console.log('Data Transfer Started');
        } else if (event.type === DataTransferType.Rw) {
          const percent = ((event.consumedBytes / event.totalBytes) * 100).toFixed(2);
          console.log(`Once Read:${event.rwOnceBytes},ConsumerBytes/TotalBytes: ${event.consumedBytes}/${event.totalBytes},${percent}%`);
        } else if (event.type === DataTransferType.Succeed) {
          const percent = ((event.consumedBytes / event.totalBytes) * 100).toFixed(2);
          console.log(`Data Transfer Succeed, ConsumerBytes/TotalBytes:${event.consumedBytes}/${event.totalBytes},${percent}%`);
        } else if (event.type === DataTransferType.Failed) {
          console.log('Data Transfer Failed');
        }
      },
    });

    // 查询刚刚上传的对象
    const { data } = await client.headObject({
      bucket: bucketName,
      key: objectName,
    });
    console.log('object size:', data['content-length']);
  } catch (error) {
    handleError(error);
  }
}

main();

