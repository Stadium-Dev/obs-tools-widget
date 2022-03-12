import Config from "./libs/Config.js";
import Streamlabs from "./services/Streamlabs.js";

const labelData = Config.get('labels') || {};

Streamlabs.on('subscription', handleSub);
Streamlabs.on('resub', handleSub);
Streamlabs.on('donation', handleDonation);

function handleSub(data) {
    labelData.lastSubscriber = data;
    saveLabels();
}

function handleDonation(data) {
    const amount = +data.formatted_amount.replace(/[\€|\$]/g, '');

    let topAmount = 0;
    if(labelData.topDonation) {
        topAmount = +labelData.topDonation.formatted_amount.replace(/[\€|\$]/g, '');
        if(amount > topAmount) {
            labelData.topDonation = data;
        }
    } else {
        labelData.topDonation = data;
    }
    
    labelData.lastDonation = data;
    saveLabels();
}

function saveLabels() {
    console.debug(labelData);
    Config.set('labels', labelData);
    emitChange();
}

const listeners = [];

function emitChange() {
    for(let callback of listeners) {
        callback();
    }
}

export default class Labels {

    static getLabelInfo(id) {
        return labelData[id];
    }

    static getLabelList() {
        return Object.keys(labelData);
    }

    static onChange(callback) {
        listeners.push(callback);
    }

}
