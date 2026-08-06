import type { Command } from '../lib/slash-command';
import { help } from './help';
import { status } from './status';
import { ping } from './ping';
import { ip } from './ip';
import { domain } from './domain';
import { cve } from './cve';
import { news } from './news';
import { report } from './report';
import { chat } from './chat';

export const commands: Command[] = [help, status, ping, ip, domain, cve, news, report, chat];