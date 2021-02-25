import Application from "./app.js";
// @ts-ignore
const socket = io();
new Application(socket);
