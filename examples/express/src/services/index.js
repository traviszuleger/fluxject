//@ts-check
import { Container } from "fluxject";
import { DatabaseProvider } from "./database";
import { AuthProvider } from "./auth";
import { LogProvider } from "./logger";
import { SecretsProvider } from "./secrets";

function createData() {
    return {
        requestId: "",
        user: {
            id: "",
            sessionId: ""
        }
    }
}

export const container = Container
    .create()
    .register(m => m.singleton({ secrets: SecretsProvider}))
    .register(m => m.singleton({ database: DatabaseProvider }))
    .register(m => m.transient({ auth: AuthProvider }))
    .register(m => m.scoped({ log: LogProvider }))
    .register(m => m.scoped({ data: createData }));