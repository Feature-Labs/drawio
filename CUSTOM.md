### 自定义开发须知

> 本分支仅用于做Drawio超梦存储库的支持。需要实现从超级云盘读写、版本历史、协作编辑等功能。整体参照GoogleDriver的功能。

1. 全局变量
    App.js
    ```javascript
    /**
    * SuperDriver Mode
    */
    App.MODE_SUPERDRIVE = 'superdrive';
    ```
2. 自定义文件

    src/main/webapp/js/diagramly
    
    | 文件名称                 | 作用      |
    |----------------------|---------|
    | SuperDriveClient.js  | 超级云盘客户端 |
    | SuperDriveFile.js    | 超级云盘文件  |
    | SuperDriveLibrary.js | 超级云盘库   |

3. 开发流程
   1. 定义对接规范，此项目在完成后通过代理集成到超梦的域名下，所以可以访问共享登录信息免登录运行
   2. 需要完成的功能：文件/文件夹打开、文件保存、协作编辑、版本记录（具体功能/流程请参照GoogleDrive）
