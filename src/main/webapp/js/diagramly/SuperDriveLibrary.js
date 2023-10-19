SuperDriveLibrary = function(ui, data, desc)
{
    SuperDriveFile.call(this, ui, data, desc);
};

mxUtils.extend(SuperDriveLibrary, SuperDriveFile);

/**
 * 是否自动保存
 * @returns {boolean}
 */
SuperDriveLibrary.prototype.isAutosave = function()
{
    return true;
};

/**
 * 保存
 * @param revision
 * @param success
 * @param error
 */
SuperDriveLibrary.prototype.save = function(revision, success, error)
{
    this.ui.drive.saveFile(this, revision, mxUtils.bind(this, function(resp)
    {
        this.desc = resp;

        if (success != null)
        {
            success(resp);
        }
    }), error);
};

SuperDriveLibrary.prototype.open = function()
{
    // Do nothing - this should never be called
};