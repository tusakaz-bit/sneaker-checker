import { default as nextHandler } from "./.open-next/worker.js";

export default {
  fetch: nextHandler.fetch,
};
