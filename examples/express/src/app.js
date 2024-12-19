//@ts-check
/** @import { HostServiceProvider } from "fluxject" */
/** @import { Express } from "express" */
import express, { Router } from "express";
import { container } from "./services/index.js";


class MyHttpServer {
    #app;
    #services;

    constructor() {
        this.#app = express();
        this.#services = container.prepare();
        this.#registerMiddleware();
        this.#initializeRoutesForAPI();
    }

    /**
     * 
     * @param {number} port 
     * @param {(() => void)=} onListen 
     */
    start(port, onListen=undefined) {
        this.#app.listen(port, onListen);
    }

    #registerMiddleware() {
        // Initialize scope
        this.#app.use((req,res,next) => {
            res.locals = this.#services.createScope();
            res.locals
            res.locals.log.debug(`Created scope.`);
            next();
        });

        // CSRF protection
        this.#app.use((req,res,next) => {
            if(req.method !== "GET") {
                const origin = req.headers.origin;
                if(!origin || origin !== res.locals.secrets.hostname) {
                    res.locals.warning(`Possible CSRF attack from [${req.ip}] (${origin})`);
                    res.sendStatus(403);
                    return;
                }
            }
            next();
        });
    }

    #initializeRoutesForAPI() {
        const router = Router();
        router.use((req,res,next) => {
            const { apiKey } = req.query;
            if(!apiKey) {
                res.sendStatus(403);
                return;
            }
            // 
        });

        this.#app.use(`/api/v1`, router);
    }
}

const server = new MyHttpServer();
server.start(3000, () => {
    console.log(`Started HTTP server on port 3000`);
});