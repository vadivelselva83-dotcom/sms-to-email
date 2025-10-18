export type Config = {
  enabled: boolean;
  allowedSenderE164: string;
  destinationEmail: string;
};

export type ApiResponse<T> = {
  ok?: boolean;
  config?: T;
  error?: string;
};
