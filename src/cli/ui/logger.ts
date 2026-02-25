import chalk from "chalk";

export const log = {
  info:    (msg: string) => console.log(chalk.cyan("  info ") + msg),
  success: (msg: string) => console.log(chalk.green("  done ") + msg),
  warn:    (msg: string) => console.log(chalk.yellow("  warn ") + msg),
  error:   (msg: string) => console.error(chalk.red("  error ") + msg),
  step:    (n: number, total: number, msg: string) =>
    console.log(chalk.dim(`  [${n}/${total}] `) + msg),
  blank:   () => console.log(),
};
