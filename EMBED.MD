自定义嵌入模式 参数格式及事件列表

> 完成进度：50%

> 请使用开发模式并指定插件：url:?dev=1&embed=1&p=sd

> load : 加载事件 **外部调用**
```text
action:load
desc: [文件描述]
    id: [文件ID] string
    name: [文件名称] string
    path: [文件路径] string
    etag: [文件Etag] string
    mtime: [修改时间 单位:s] number
    instanceId: [实例ID] number
    disableAutoSave: [是否开启自动保存] boolean
    versionsEnabled: [是否开启版本] boolean
    ver: [文件版本] number
    shareToken: [分享Token] string
```

> getCurrentUser : 获取当前用户
```text
参数：无
```
```text
返回值：
user:
    uid: [用户ID] string
    displayName: [名称] string
```

> loadFileVersion : 获取历史版本文件
```text
参数：
id: 文件ID
revId: 版本ID
```
```text
返回值:

```

> getFileRevisions : 获取文件版本信息
```text
参数：
id: 文件ID
```
```text
返回值：[]
timestamp: [更新时间] number
revId: [版本ID] string
```

> saveFile : 保存文件
```text
参数1: 【保存文件】
id: [文件ID] string
shareToken: [分享Token] string
savedData: [保存数据] object
etag: [文件etag] string
参数2: 【新建文件】
path: [新建文件的目录] string
savedData: [保存的数据] object
etag: [文件etag] string
```
```text
返回值:
desc: 【同上】
```

> loadFile : 加载文件
```text
参数1: 【加载文件】
id: [文件ID] string
shareToken: [分享Token] string
参数2: 【创建文件】
path: [文件路径] string
```