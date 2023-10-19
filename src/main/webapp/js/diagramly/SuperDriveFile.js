/**
 * jsdoc注释中，?为存疑的方法，*为待实现的方法
 *
 * 数据结构：
 * desc: [文件信息]
 *  id: [文件ID] number
 *  title: [文件名称] string
 *  fileSize: [文件大小] number
 *  editable: [是否可以编辑] boolean
 *  webContentLink: [内容地址]
 *  modifiedDate: [修改时间] number
 *  headRevisionId: [头版本ID] number
 *  etag: [文件etag] number
 *  canComment: [是否可以评论] boolean
 *  parents: [父级文件夹] []
 *      id: [文件夹ID] number
 *  labels: [标签]
 *      restricted: [是否严格模式] boolean
 *      trashed: [是否在回收站] boolean
 *  userPermission: [用户权限]
 *      role: [角色] 'reader'-读取
 */

SuperDriveFile = function(ui, data, desc)
{
    DrawioFile.call(this, ui, data);

    this.desc = desc;
};

mxUtils.extend(SuperDriveFile, DrawioFile);

SuperDriveFile.prototype.saveDelay = 0;

SuperDriveFile.prototype.allChangesSavedKey = 'allChangesSavedInSuperDrive';

SuperDriveFile.prototype.getSize = function()
{
    return this.desc.fileSize;
};

/**
 * ?
 * 严格模式
 * @returns {false|*}
 */
SuperDriveFile.prototype.isRestricted = function()
{
    return DrawioFile.RESTRICT_EXPORT || (this.desc.userPermission != null && this.desc.labels != null &&
        this.desc.userPermission.role == 'reader' && this.desc.labels.restricted);
};

/**
 * ?
 * 获取当前用户
 * @returns {null|null}
 */
SuperDriveFile.prototype.getCurrentUser = function()
{
    return (this.ui.drive != null) ? this.ui.drive.user : null;
};

SuperDriveFile.prototype.getMode = function()
{
    return App.MODE_SUPERDRIVE;
};

/**
 * *
 * 获取文件地址
 * @returns {string}
 */
SuperDriveFile.prototype.getFileUrl = function()
{
    return 'https://drive.google.com/open?authuser=0&id=' + this.getId();
};

/**
 * *
 * 获取文件夹地址
 * @returns {string|null}
 */
SuperDriveFile.prototype.getFolderUrl = function()
{
    if (this.desc.labels != null && this.desc.labels.trashed)
    {
        return 'https://drive.google.com/drive/trash';
    }
    else
    {
        return (this.desc.parents != null && this.desc.parents.length > 0) ?
            'https://drive.google.com/drive/folders/' +
            this.desc.parents[0].id : null;
    }
};

/**
 * *
 * 获取公开地址
 * @param fn
 */
SuperDriveFile.prototype.getPublicUrl = function(fn)
{
    this.ui.drive.executeRequest({
            url: '/files/' + this.desc.id + '/permissions?supportsAllDrives=true'
        },
        mxUtils.bind(this, function(resp)
        {
            if (resp != null && resp.items != null)
            {
                for (var i = 0; i < resp.items.length; i++)
                {
                    if (resp.items[i].id === 'anyoneWithLink' ||
                        resp.items[i].id === 'anyone')
                    {
                        fn(this.desc.webContentLink);

                        return;
                    }
                }
            }

            fn(null);
        }), mxUtils.bind(this, function()
        {
            fn(null)
        }));
};

/**
 * 是否开启自动保存
 * @returns {boolean}
 */
SuperDriveFile.prototype.isAutosaveOptional = function()
{
    return true;
};

/**
 * *
 * 是否支持重命名
 * @returns {*}
 */
SuperDriveFile.prototype.isRenamable = function()
{
    return this.isEditable() && DrawioFile.prototype.isEditable.apply(this, arguments);
};

/**
 * 是否支持移动
 * @returns {*}
 */
SuperDriveFile.prototype.isMovable = function()
{
    return this.isEditable();
};

/**
 * *
 * 是否在回收站中
 * @returns {*}
 */
SuperDriveFile.prototype.isTrashed = function()
{
    return this.desc.labels.trashed;
};

/**
 * *
 * 保存
 * @param revision
 * @param success
 * @param error
 * @param unloading
 * @param overwrite
 */
SuperDriveFile.prototype.save = function(revision, success, error, unloading, overwrite)
{
    DrawioFile.prototype.save.apply(this, [revision, mxUtils.bind(this, function()
    {
        this.saveFile(null, revision, success, error, unloading, overwrite);
    }), error, unloading, overwrite]);
};

/**
 * *
 * 保存文件
 * @param title
 * @param revision
 * @param success
 * @param error
 * @param unloading
 * @param overwrite
 */
DriveFile.prototype.saveFile = function(title, revision, success, error, unloading, overwrite)
{
    try
    {
        if (!this.isEditable())
        {
            if (success != null)
            {
                success();
            }
        }
        else if (!this.savingFile)
        {
            // Sets shadow modified state during save
            this.savingFileTime = new Date();
            this.setShadowModified(false);
            this.savingFile = true;

            this.createSecret(mxUtils.bind(this, function(secret, token)
            {
                var doSave = mxUtils.bind(this, function(realOverwrite, realRevision)
                {
                    try
                    {
                        var lastDesc = this.desc;

                        if (this.sync != null)
                        {
                            this.sync.fileSaving();
                        }

                        this.ui.drive.saveFile(this, realRevision, mxUtils.bind(this, function(resp, savedData, pages, checksum)
                        {
                            try
                            {
                                this.savingFile = false;

                                // Handles special case where resp is false eg
                                // if the old file was converted to realtime
                                if (resp != false)
                                {
                                    // Checks for changes during save
                                    this.setModified(this.getShadowModified());

                                    if (revision)
                                    {
                                        this.lastAutosaveRevision = new Date().getTime();
                                    }

                                    // Adaptive autosave delay
                                    this.autosaveDelay = Math.round(Math.min(10000,
                                        Math.max(DriveFile.prototype.autosaveDelay,
                                            this.saveDelay)));
                                    this.desc = resp;

                                    // Shows possible errors but keeps the modified flag as the
                                    // file was saved but the cache entry could not be written
                                    if (token != null || !Editor.enableRealtimeCache)
                                    {
                                        this.fileSaved(savedData, lastDesc, mxUtils.bind(this, function()
                                        {
                                            this.contentChanged();

                                            if (success != null)
                                            {
                                                success(resp);
                                            }
                                        }), error, token, pages, checksum);
                                    }
                                    else if (success != null)
                                    {
                                        // TODO: Fix possible saving state never being reset
                                        success(resp);
                                    }
                                }
                                else if (error != null)
                                {
                                    error(resp);
                                }
                            }
                            catch (e)
                            {
                                this.savingFile = false;

                                if (error != null)
                                {
                                    error(e);
                                }
                                else
                                {
                                    throw e;
                                }
                            }
                        }), mxUtils.bind(this, function(err, desc)
                        {
                            try
                            {
                                this.savingFile = false;

                                if (this.isConflict(err))
                                {
                                    this.inConflictState = true;

                                    if (this.sync != null)
                                    {
                                        this.savingFile = true;

                                        this.sync.fileConflict(desc, mxUtils.bind(this, function()
                                        {
                                            // Adds random cool-off
                                            window.setTimeout(mxUtils.bind(this, function()
                                            {
                                                this.updateFileData();
                                                this.setShadowModified(false);
                                                doSave(realOverwrite, true);
                                            }), 100 + Math.random() * 500);
                                        }), mxUtils.bind(this, function()
                                        {
                                            this.savingFile = false;

                                            if (error != null)
                                            {
                                                error();
                                            }
                                        }));
                                    }
                                    else if (error != null)
                                    {
                                        error();
                                    }
                                }
                                else if (error != null)
                                {
                                    error(err);
                                }
                            }
                            catch (e)
                            {
                                this.savingFile = false;

                                if (error != null)
                                {
                                    error(e);
                                }
                                else
                                {
                                    throw e;
                                }
                            }
                        }), unloading, unloading, realOverwrite, null, secret);
                    }
                    catch (e)
                    {
                        this.savingFile = false;

                        if (error != null)
                        {
                            error(e);
                        }
                        else
                        {
                            throw e;
                        }
                    }
                });

                doSave(overwrite, revision);
            }));
        }
    }
    catch (e)
    {
        if (error != null)
        {
            error(e);
        }
        else
        {
            throw e;
        }
    }
};

/**
 * *
 * 复制文件
 * @param success
 * @param error
 */
SuperDriveFile.prototype.copyFile = function(success, error)
{
    if (!this.isRestricted())
    {
        this.makeCopy(mxUtils.bind(this, function()
        {
            if (this.ui.spinner.spin(document.body, mxResources.get('saving')))
            {
                try
                {
                    this.save(true, success, error)
                }
                catch (e)
                {
                    error(e);
                }
            }
        }), error, true);
    }
    else
    {
        DrawioFile.prototype.copyFile.apply(this, arguments);
    }
};

/**
 * ?
 * 服务端复制
 * @param success
 * @param error
 * @param timestamp
 */
SuperDriveFile.prototype.makeCopy = function(success, error, timestamp)
{
    if (this.ui.spinner.spin(document.body, mxResources.get('saving')))
    {
        // Uses copyFile internally which is a remote REST call with the advantage of keeping
        // the parents of the file in-place, but copies the remote file contents so needs to
        // be updated as soon as we have the ID.
        this.saveAs(this.ui.getCopyFilename(this, timestamp), mxUtils.bind(this, function(resp)
        {
            this.desc = resp;
            this.ui.spinner.stop();
            this.setModified(false);

            this.backupPatch = null;
            this.invalidChecksum = false;
            this.inConflictState = false;

            this.descriptorChanged();
            success();
        }), mxUtils.bind(this, function()
        {
            this.ui.spinner.stop();

            if (error != null)
            {
                error();
            }
        }));
    }
};

/**
 * *
 * 另存为
 * @param filename
 * @param success
 * @param error
 */
SuperDriveFile.prototype.saveAs = function(filename, success, error)
{
    this.ui.drive.copyFile(this.getId(), filename, success, error);
};

/**
 * *
 * 重命名
 * @param title
 * @param success
 * @param error
 */
SuperDriveFile.prototype.rename = function(title, success, error)
{
    var rev = this.getCurrentRevisionId();

    this.ui.drive.renameFile(this.getId(), title, mxUtils.bind(this, function(desc)
    {
        if (!this.hasSameExtension(title, this.getTitle()))
        {
            this.desc = desc;

            if (this.sync != null)
            {
                this.sync.descriptorChanged(rev);
            }

            this.save(true, success, error);
        }
        else
        {
            this.desc = desc;
            this.descriptorChanged();

            if (this.sync != null)
            {
                this.sync.descriptorChanged(rev);
            }

            if (success != null)
            {
                success(desc);
            }
        }
    }), error);
};

/**
 * 移动文件
 * @param folderId
 * @param success
 * @param error
 */
SuperDriveFile.prototype.move = function(folderId, success, error)
{
    this.ui.drive.moveFile(this.getId(), folderId, mxUtils.bind(this, function(resp)
    {
        this.desc = resp;
        this.descriptorChanged();

        if (success != null)
        {
            success(resp);
        }
    }), error);
};

/**
 * 分享文件
 */
SuperDriveFile.prototype.share = function()
{
    this.ui.drive.showPermissions(this.getId());
};

/**
 * 获取标题
 * @returns {*}
 */
SuperDriveFile.prototype.getTitle = function()
{
    return this.desc.title;
};

/**
 * 获取哈希ID
 * @returns {string}
 */
SuperDriveFile.prototype.getHash = function()
{
    return 'S' + this.getId();
};

/**
 * 获取ID
 * @returns {*}
 */
SuperDriveFile.prototype.getId = function()
{
    return this.desc.id;
};

/**
 * 是否可编辑
 * @returns {*}
 */
SuperDriveFile.prototype.isEditable = function()
{
    return DrawioFile.prototype.isEditable.apply(this, arguments) &&
        this.desc.editable;
};

/**
 * 是否支持同步
 * @returns {boolean}
 */
SuperDriveFile.prototype.isSyncSupported = function()
{
    return true;
};

/**
 * 是否支持协作编辑
 * @returns {boolean}
 */
SuperDriveFile.prototype.isRealtimeSupported = function()
{
    return true;
};

/**
 * 是否开启协作编辑
 * @returns {false|boolean|*}
 */
SuperDriveFile.prototype.isRealtimeOptional = function()
{
    return this.sync != null && this.sync.isConnected();
};

/**
 * *
 * 开启协作状态
 * @param value
 * @param success
 * @param error
 */
SuperDriveFile.prototype.setRealtimeEnabled = function(value, success, error)
{
    if (this.sync != null)
    {
        this.ui.drive.executeRequest({
            'url': '/files/' + this.getId() + '/properties?alt=json&supportsAllDrives=true',
            'method': 'POST',
            'contentType': 'application/json; charset=UTF-8',
            'params': {
                'key': 'collaboration',
                'value': (value) ? 'enabled' :
                    ((urlParams['fast-sync'] != '0') ?
                        'disabled' : '')
            }
        }, mxUtils.bind(this, function()
        {
            this.loadDescriptor(mxUtils.bind(this, function(desc)
            {
                if (desc != null)
                {
                    this.sync.descriptorChanged(this.getCurrentEtag());
                    this.sync.updateDescriptor(desc);
                    success();
                }
                else
                {
                    error();
                }
            }), error);
        }), error);
    }
    else
    {
        error();
    }
};

/**
 * 开启协作状态
 * @returns {*|boolean}
 */
SuperDriveFile.prototype.isRealtimeEnabled = function()
{
    var collab = this.ui.drive.getCustomProperty(this.desc, 'collaboration');

    return (DrawioFile.prototype.isRealtimeEnabled.apply(this, arguments) &&
        collab != 'disabled') || (Editor.enableRealtime && collab == 'enabled');
};

/**
 * 是否支持回退历史
 * @returns {boolean}
 */
SuperDriveFile.prototype.isRevisionHistorySupported = function()
{
    return true;
};

/**
 * 获取历史信息
 * @param success
 * @param error
 */
SuperDriveFile.prototype.getRevisions = function(success, error)
{
    this.ui.drive.executeRequest(
        {
            url: '/files/' + this.getId() + '/revisions'
        },
        mxUtils.bind(this, function(resp)
        {
            for (var i = 0; i < resp.items.length; i++)
            {
                (mxUtils.bind(this, function(item)
                {
                    // Redirects title to originalFilename to
                    // match expected descriptor interface
                    item.title = item.originalFilename;

                    item.getXml = mxUtils.bind(this, function(itemSuccess, itemError)
                    {
                        this.ui.drive.getXmlFile(item, mxUtils.bind(this, function(file)
                        {
                            itemSuccess(file.getData());
                        }), itemError);
                    });

                    item.getUrl = mxUtils.bind(this, function(page)
                    {
                        return this.ui.getUrl(window.location.pathname + '?rev=' + item.id +
                            '&chrome=0&nav=1&layers=1&edit=_blank' + ((page != null) ?
                                '&page=' + page : '')) + window.location.hash;
                    });
                }))(resp.items[i]);
            }

            success(resp.items);
        }), error);
};

/**
 * 获取最终版本
 * @param success
 * @param error
 */
SuperDriveFile.prototype.getLatestVersion = function(success, error)
{
    this.ui.drive.getFile(this.getId(), success, error, true);
};

/**
 * 获取频道ID 协作
 * @returns {string}
 */
SuperDriveFile.prototype.getChannelId = function()
{
    var chan = this.ui.drive.getCustomProperty(this.desc, 'channel');

    if (chan != null)
    {
        chan = 'S-' + this.getId() + '.' + chan;
    }

    return chan;
};

/**
 * 获取频道key
 * @returns {null}
 */
SuperDriveFile.prototype.getChannelKey = function()
{
    return this.ui.drive.getCustomProperty(this.desc, 'key');
};

/**
 * 获取最后修改时间
 * @returns {Date}
 */
SuperDriveFile.prototype.getLastModifiedDate = function()
{
    return new Date(this.desc.modifiedDate);
};

/**
 * 获取文档信息
 * @returns {*}
 */
SuperDriveFile.prototype.getDescriptor = function()
{
    return this.desc;
};

/**
 * 设置文档信息
 * @param desc
 */
SuperDriveFile.prototype.setDescriptor = function(desc)
{
    this.desc = desc;
};

/**
 * 设置头部版本ID
 * @param desc
 * @param id
 */
SuperDriveFile.prototype.setDescriptorRevisionId = function(desc, id)
{
    desc.headRevisionId = id;
};

/**
 * 获取头部版本ID
 * @param desc
 * @returns {*}
 */
SuperDriveFile.prototype.getDescriptorRevisionId = function(desc)
{
    return desc.headRevisionId;
};

/**
 * 获取文件Etag
 * @param desc
 * @returns {{}|*}
 */
SuperDriveFile.prototype.getDescriptorEtag = function(desc)
{
    return desc.etag;
};

/**
 * 设置文件Etag
 * @param desc
 * @param etag
 */
SuperDriveFile.prototype.setDescriptorEtag = function(desc, etag)
{
    desc.etag = etag;
};

/**
 * 获取补丁信息
 * @param success
 * @param error
 */
SuperDriveFile.prototype.loadPatchDescriptor = function(success, error)
{
    this.ui.drive.executeRequest(
        {
            url: '/files/' + this.getId() + '?supportsAllDrives=true&fields=' + this.ui.drive.catchupFields
        },
        mxUtils.bind(this, function(desc)
        {
            success(desc);
        }), error);
};

/**
 * 设置补丁信息
 * @param desc
 * @param patch
 */
SuperDriveFile.prototype.patchDescriptor = function(desc, patch)
{
    desc.headRevisionId = patch.headRevisionId;
    desc.modifiedDate = patch.modifiedDate;

    DrawioFile.prototype.patchDescriptor.apply(this, arguments);
};

/**
 * 加载补丁
 * @param success
 * @param error
 */
SuperDriveFile.prototype.loadDescriptor = function(success, error)
{
    this.ui.drive.loadDescriptor(this.getId(), success, error);
};

/**
 * 是否支持评论
 * @returns {boolean}
 */
SuperDriveFile.prototype.commentsSupported = function()
{
    return true;
};

/**
 * 获取评论
 * @param success
 * @param error
 */
SuperDriveFile.prototype.getComments = function(success, error)
{
    var currentUser = this.ui.getCurrentUser();

    function driveCommentToDrawio(file, gComment, pCommentId)
    {
        if (gComment.deleted) return null; //skip deleted comments

        var comment = new DriveComment(file, gComment.commentId || gComment.replyId, gComment.content,
            gComment.modifiedDate, gComment.createdDate, gComment.status == 'resolved',
            gComment.author.isAuthenticatedUser? currentUser :
                new DrawioUser(gComment.author.permissionId, gComment.author.emailAddress,
                    gComment.author.displayName, gComment.author.picture.url), pCommentId);

        for (var i = 0; gComment.replies != null && i < gComment.replies.length; i++)
        {
            comment.addReplyDirect(driveCommentToDrawio(file, gComment.replies[i], gComment.commentId));
        }

        return comment;
    };

    this.ui.drive.executeRequest(
        {
            url: '/files/' + this.getId() + '/comments'
        },
        mxUtils.bind(this, function(resp)
        {
            var comments = [];

            for (var i = 0; i < resp.items.length; i++)
            {
                var comment = driveCommentToDrawio(this, resp.items[i]);

                if (comment != null) comments.push(comment);
            }

            success(comments);
        }), error);
};

/**
 * 添加评论
 * @param comment
 * @param success
 * @param error
 */
SuperDriveFile.prototype.addComment = function(comment, success, error)
{
    var body = {'content': comment.content};

    this.ui.drive.executeRequest(
        {
            url: '/files/' + this.getId() + '/comments',
            method: 'POST',
            params: body
        },
        mxUtils.bind(this, function(resp)
        {
            success(resp.commentId); //pass comment id
        }), error);
};


/**
 * 是否支持回复
 * @returns {boolean}
 */
SuperDriveFile.prototype.canReplyToReplies = function()
{
    return false;
};

/**
 * 编辑者是否可以评论
 * @returns {*}
 */
SuperDriveFile.prototype.canComment = function()
{
    return this.desc.canComment;
};

/**
 * *
 * 设置评论
 * @param content
 * @param user
 * @returns {DriveComment}
 */
SuperDriveFile.prototype.newComment = function(content, user)
{
    return new DriveComment(this, null, content, Date.now(), Date.now(), false, user);
};
