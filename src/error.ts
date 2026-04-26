import { ContentfulStatusCode } from "hono/utils/http-status";

export class MMError extends Error {
    readonly message: string;
    readonly status: ContentfulStatusCode;

    constructor(
        status: ContentfulStatusCode,
        message: string,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.message = message;
        this.status = status;
    }
}

export const catch_ = (err: unknown, message: string) => {
    throw err instanceof MMError
        ? err
        : new MMError(
              500,
              `${message}: ${err instanceof Error ? err.message : String(err)}`,
              { cause: err },
          );
};
