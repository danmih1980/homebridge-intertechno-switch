var Service, Characteristic, HomebridgeAPI;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  HomebridgeAPI = homebridge
  
  homebridge.registerAccessory("homebridge-intertechno-switch", "IntertechnoSwitch", IntertechnoSwitch);
}

function IntertechnoSwitch(log, config) {
    this.log = log;
    this.name = config["name"];
    this.host = config["host"];
    this.port = config["port"] || 49880;
    this.code = config["code"]

    this.cacheDirectory = HomebridgeAPI.user.persistPath();
	this.storage = require('node-persist');
	this.storage.initSync({dir:this.cacheDirectory, forgiveParseErrors: true});
    
    this.service = new Service.Switch(this.name);
    this.service
        .getCharacteristic(Characteristic.On)
        .on('set', this._setOn.bind(this));

    var cachedState = this.storage.getItemSync(this.name);
    if ((cachedState === undefined) || (cachedState === false)) {
        this.service.setCharacteristic(Characteristic.On, false);
    } else {
        this.service.setCharacteristic(Characteristic.On, true);
    }
}

IntertechnoSwitch.prototype.getServices = function() {
    return [this.service];
}

IntertechnoSwitch.prototype._setOn = function(on, callback) {
    this.log("Setting Intertechno Switch to " + on);

    const h = "4,12,12,4,";
    const l = "4,12,4,12,";

    this.log(this.code);
    a = (this.code.charCodeAt(0) - 'A'.charCodeAt(0)).toString(2).padStart(4,0);
    b = (this.code.charCodeAt(1) - '1'.charCodeAt(0)).toString(2).padStart(4,0);

    var master = '';
    var slave = '';
    var toggle = on ? h+h : h+l;
    for (var i = 3; i >= 0; i--) {
        master += (a[i] === '1') ? h : l;
        slave += (b[i] === '1') ? h : l;
    }
    var msg = "0,0,6,11125,89,26,0," + master + slave + (l+h) + toggle + "1,125,0";

    const dgram = require('dgram');
    const client = dgram.createSocket('udp4');
    client.send(msg, this.port, this.host, (err) => {
        client.close();
    });

    this.storage.setItemSync(this.name, on);
    
    callback();
}
