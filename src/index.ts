import * as IPFS from "ipfs-http-client";
import readline from "readline";
import OrbitDb from "orbit-db";

interface MessagePayload {
  msg: string;
  nickname: string;
}

function scanln(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ipfs = IPFS.create({
    host: "127.0.0.1",
    port: 5001,
    protocol: "http",
  });

  const orbitdb = await OrbitDb.createInstance(ipfs as never);

  const nickname = await scanln(rl, "\n\n\n\nNickname: ");
  const address = await scanln(rl, "Entre com o Endereço ou Nome: ");
  const db = await orbitdb.log(address, {
    accessController: {
      write: ["*"],
    },
  });
  console.log(`Chat rodando em: ${db.address}`);

  let isLast = false;

  db.events.on("replicated", () => {
    let messages: LogEntry<MessagePayload>[] = [];
    if (!isLast) {
      isLast = true;
      messages = db
        .iterator({ limit: -1 })
        .collect() as unknown as LogEntry<MessagePayload>[];
    } else {
      messages = [
        db
          .iterator({ limit: 1 })
          .collect()[0] as unknown as LogEntry<MessagePayload>,
      ];
    }

    messages.forEach((msg) => {
      console.log(`[${msg.payload.value.nickname}] ${msg.payload.value.msg}`);
    });
  });

  for (;;) {
    const message = await scanln(rl, "> ");
    await db.add({ msg: message, nickname } as MessagePayload);
  }
}

main();
