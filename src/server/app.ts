import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import BlockchainServer from "./blockchain-server";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 9000;

app.use(express.static(path.join(__dirname, "..", "..", "dist", "client")));

BlockchainServer.initialize(io);

server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
