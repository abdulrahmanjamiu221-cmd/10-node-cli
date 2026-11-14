const supportedOptions = new Set(["amount", "category", "note", "date", "month", "id", "set"]);

export function parseArgs(argv) {
  const [command = "help", ...args] = argv;
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const separator = argument.indexOf("=");
    const name = argument.slice(2, separator === -1 ? undefined : separator);
    const value = separator === -1 ? args[index + 1] : argument.slice(separator + 1);

    if (!supportedOptions.has(name)) {
      throw new Error(`Unknown option: --${name}`);
    }
    if (value === undefined || value.startsWith("--") || value.length === 0) {
      throw new Error(`Option --${name} requires a value.`);
    }

    options[name] = value;
    if (separator === -1) index += 1;
  }

  return { command, options };
}
