import chalk from "chalk";
import ora from "ora";

const spinner = ora();

export function logUnimportant(msg: string) {
  console.log(chalk.gray(msg));
}
export function logSuccess(msg: string) {
  spinner.succeed(msg);
}

export function logWarning(msg: string) {
  spinner.warn(msg);
}

export function logError(msg: string, err: any) {
  spinner.fail(msg);
  console.error(err, "\n");
}
