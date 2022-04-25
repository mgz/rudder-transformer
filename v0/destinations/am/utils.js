/* eslint-disable no-nested-ternary */
// We want to send the following kind of device properties from web platform
// which is not readily available, so have to parse the user-agent
// using similar  ua parsing logic used by AM native web sdk
// "platform": "Web",
// "os_name": "Chrome",
// "os_version": "85",
// "device_model": "Mac"
// Note: for http source still the direct mapping from payload sourceKeys is used to
// populate these dest keys
const logger = require("../../../logger");
const get = require("get-value");
const uaParser = require("@amplitude/ua-parser-js");
const { isDefined, isDefinedAndNotNull } = require("../../util");

function getInfoFromUA(path, payload, defaultVal) {
  const ua = get(payload, "context.userAgent");
  const devInfo = ua ? uaParser(ua) : {};
  return get(devInfo, path) || defaultVal;
}

function getOSName(payload, sourceKey) {
  const payloadVal = get(payload, sourceKey);
  if (payload.channel && payload.channel.toLowerCase() === "web") {
    return getInfoFromUA("browser.name", payload, payloadVal);
  }
  return payloadVal;
}

function getOSVersion(payload, sourceKey) {
  const payloadVal = get(payload, sourceKey);

  if (payload.channel && payload.channel.toLowerCase() === "web") {
    return getInfoFromUA("browser.version", payload, payloadVal);
  }
  return payloadVal;
}

function getDeviceModel(payload, sourceKey) {
  const payloadVal = get(payload, sourceKey);

  if (payload.channel && payload.channel.toLowerCase() === "web") {
    return getInfoFromUA("os.name", payload, payloadVal);
  }
  return payloadVal;
}

function getDeviceManufacturer(payload, sourceKey) {
  const payloadVal = get(payload, sourceKey);

  if (payload.channel && payload.channel.toLowerCase() === "web") {
    return getInfoFromUA("device.vendor", payload, payloadVal);
  }
  return payloadVal;
}

function getPlatform(payload, sourceKey) {
  const payloadVal = get(payload, sourceKey);
  return payload.channel
    ? payload.channel.toLowerCase() === "web"
      ? "Web"
      : payloadVal
    : payloadVal;
}

function getBrand(payload, sourceKey, Config) {
  if (Config.mapDeviceBrand) {
    const payloadVal = get(payload, sourceKey);
    return payloadVal;
  }
  return undefined;
}

function getEventId(payload) {
  const event_id =
    payload?.context?.traits?.event_id ||
    payload?.traits?.event_id ||
    payload?.properties?.event_id;
  if (isDefinedAndNotNull(event_id)) {
    if (typeof event_id === "string") {
      logger.info(`event_id should be integer only`);
    } else return event_id;
  }
  return undefined;
}

module.exports = {
  getOSName,
  getOSVersion,
  getDeviceModel,
  getDeviceManufacturer,
  getPlatform,
  getBrand,
  getEventId
};
