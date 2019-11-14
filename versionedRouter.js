const Router = require("koa-router");
const _ = require("lodash");

const { lstatSync, readdirSync } = require("fs");
const { join } = require("path");

const versions = ["v0"];

const router = new Router();

const isDirectory = source => lstatSync(source).isDirectory();

const getDirectories = source =>
  readdirSync(source)
    .map(name => join(source, name))
    .filter(isDirectory);

const getDestHandler = versionedDestination => {
  return require(`./${versionedDestination}/transform`);
};

let areFunctionsEnabled = -1;
const functionsEnabled = () => {
  if (areFunctionsEnabled === -1) {
    areFunctionsEnabled = process.env.ENABLE_FUNCTIONS === "false" ? 0 : 1;
  }
  return areFunctionsEnabled === 1;
};

const userTransformHandler = () => {
  if (functionsEnabled()) {
    return require("./util/customTransformer").userTransformHandler;
  }
  throw new Error("Functions are not enabled");
};

versions.forEach(version => {
  const versionDestinations = getDirectories(version);
  versionDestinations.forEach(versionedDestination => {
    const destHandler = getDestHandler(versionedDestination);
    router.post(`/${versionedDestination}`, async (ctx, next) => {
      let events = ctx.request.body;

      if (functionsEnabled()) {
        try {
          const groupedEvents = _.groupBy(
            events,
            event => event.destination.ID
          );
          const transformedEvents = [];
          await Promise.all(
            Object.entries(groupedEvents).map(async ([dest, destEvents]) => {
              const transformationVersionId =
                destEvents[0] &&
                destEvents[0].destination &&
                destEvents[0].destination.Transformations &&
                destEvents[0].destination.Transformations[0] &&
                destEvents[0].destination.Transformations[0].VersionID;
              if (transformationVersionId) {
                const destTransformedEvents = await userTransformHandler()(
                  destEvents,
                  transformationVersionId
                );
                transformedEvents.push(...destTransformedEvents);
              } else {
                transformedEvents.push(...destEvents);
              }
            })
          );
          events = transformedEvents;
        } catch (error) {
          // Is not exoected to happen, since errors are caught in userTransformHandler
          const respList = [];
          events.forEach(event => {
            respList.push({ statusCode: 400, error: error.message });
          });
          console.log("ERROR: ", error);
          ctx.body = respList;
          return;
        }
      }

      // No errors should be returned in Destination Handler
      ctx.body = await destHandler.process(events);
    });
  });
});

module.exports = router;
