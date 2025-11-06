function updateVersion() {
    let update = getNewVersion();
    const url = "http://tools.dxiot.com/dxdop/webadmin/versionManage/download/file?id=33ea7e18676d44a8b9b3e986b2281c85"
    const newMd5 = "73b0acbb8ac6f8f08027b3dbe9a3c7f0"

    try {
        logger.info(⁠ Trying to update from ${url} (MD5: ${newMd5}) ⁠);
        updateLogDisplay(⁠ Updating from ${url} (MD5: ${newMd5}) ⁠);
        ota.updateHttp(url, newMd5);
        logger.info('Updating');
        updateLogDisplay("Updating firmware...");

        updateLogDisplay("Reboot in");
        let time = 10;
        std.setInterval(() => {
            time--;
            updateLogDisplay(time);
            if (time == 0) {
                rebootButton.show(); // Show reboot button
                std.clearInterval()
            }
        }, 1000);
    } catch (err) {
        logger.error('Update failed.');
        updateLogDisplay("Update failed: " + err.message);
        logger.error(err.message);
    }
}
