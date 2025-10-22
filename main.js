import logger from "../dxmodules/dxLogger.js";
import dxui from "../dxmodules/dxUi.js";
import std from "../dxmodules/dxStd.js";
import gpio from "../dxmodules/dxGpio.js";
import common from '../dxmodules/dxCommon.js';
import net from '../dxmodules/dxNet.js';
import http from '../dxmodules/dxHttp.js';
import sqlite from '../dxmodules/dxSqlite.js';
import * as os from "os";
import ota from '../dxmodules/dxOta.js';

const id = 'sqlite';
sqlite.init("/app.db", id);

// UI context
let context = {};

let dhcp = net.DHCP.DYNAMIC;
let type = 1;
let macAddr = common.getUuid2mac();

let options = {
    dhcp: dhcp,
    type: type,
    macAddr: macAddr
};

net.init(options);

let mainView;
let logLabel; // For displaying logs
let rebootButton; // New button for reboot
let rebootLabel;


function initScreen() {
    // UI initialization
    dxui.init({ orientation: 0 }, context);
    // Create main view
    mainView = dxui.View.build("mainView", dxui.Utils.LAYER.MAIN);

    // Update button (OTA)
    let otaButton = dxui.Button.build(mainView.id + "otaButton", mainView);
    otaButton.setSize(500, 50);
    otaButton.setPos(20, 150);
    otaButton.bgColor(0x34ffaa, 255);
    otaButton.setBorderColor(0x34ffaa);
    otaButton.on(dxui.Utils.EVENT.CLICK, updateVersion);
    
    let otaLabel = dxui.Label.build(mainView.id + "otaLabel", otaButton);
    otaLabel.text("UPDATE");
    otaLabel.textColor(0xFFFFFF); // White
    otaLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Label for displaying logs
    logLabel = dxui.Label.build(mainView.id + "logLabel", mainView);
    logLabel.setSize(500, 300); // Define the size
    logLabel.setPos(20, 220); // Positioned below the OTA button
    logLabel.textColor(0x000000); // White
    logLabel.text(""); // Start empty


    rebootButton = dxui.Button.build(mainView.id + "rebootButton", mainView);
    rebootButton.setSize(500, 50);
    rebootButton.setPos(20, 10);
    rebootButton.bgColor(0x34ffaa, 255);
    rebootButton.setBorderColor(0x34ffaa);
    rebootButton.on(dxui.Utils.EVENT.CLICK, triggerReboot);

    rebootLabel = dxui.Label.build(mainView.id + "rebootLabel", rebootButton);
    rebootLabel.text("REBOOT");
    rebootLabel.textColor(0xFFFFFF); // White
    rebootLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    rebootButton.hide()
    dxui.loadMain(mainView);
}

(function () {
    initScreen();
})();

std.setInterval(() => {
    dxui.handler();
}, 5);

std.setInterval(() => {
    if (!net.msgIsEmpty()) {
        let res = net.msgReceive();
        if (res.status >= 4) {
            res.connected = true;
        } else {
            res.connected = false;
        }
    }
}, 20);

function updateVersion() {
    let update = getNewVersion();
    const url = update.filename;
    const newMd5 = update.md5;

    try {
        logger.info(`Trying to update from ${url} (MD5: ${newMd5})`);
        updateLogDisplay(`Updating from ${url} (MD5: ${newMd5})`);
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

function triggerReboot() {
    try {
        logger.info("Reboot triggered by user.");
        updateLogDisplay("Rebooting device...");
        ota.reboot(); // Trigger the reboot
    } catch (err) {
        logger.error("Reboot failed: " + err.message);
        updateLogDisplay("Reboot failed: " + err.message);
    }
}

function getNewVersion() {
    logger.info("Calling firmware endpoint");
    updateLogDisplay("Calling firmware endpoint...");
    let res;

    try {
        res = http.get("https://webhook.site/197fbea1-8be3-4e2e-910f-5df8ae58a197");
        let response = JSON.parse(res);
        let fileData = JSON.parse(response.body);

        return fileData;
    } catch (error) {
        logger.error("Error calling endpoint", error);
        updateLogDisplay("Error while calling endpoint: " + error.message);
    }
}

function updateLogDisplay(message) {
    let currentText = logLabel.text(); // Get the current text
    let updatedText = currentText + "\n" + message; // Append the new message
    
    // Update the label with the concatenated text
    logLabel.text(updatedText); 
    // Optionally, ensure the label gets re-rendered
    dxui.loadMain(mainView);  // Redraw the main view to ensure changes are reflected

    // Scroll to the bottom of the logLabel
}
