import 'dotenv/config';
import { GatewayDispatchEvents } from 'discord-api-types/v10';
import chalk from 'chalk';
import Table from 'cli-table3';
import { HieuTool, TaskType } from './src/engine.js';

if (!process.env.TOKEN) {
    console.error(chalk.hex('#d63031').bold('\n  ✖ ERROR: TOKEN is not set.'));
    console.error(chalk.hex('#636e72')('  Copy .env.example to .env and add your Discord user token.\n'));
    process.exit(1);
}

const app = new HieuTool(process.env.TOKEN);

// Handle WebSocket-level errors (e.g. invalid / expired token, network issues)
app.ws.on('error', ({ error }) => {
    const msg = error?.message ?? String(error);
    if (/authentication/i.test(msg)) {
        console.error(chalk.hex('#d63031').bold('\n  ✖ Authentication failed — your Discord token is invalid or expired.'));
        console.error(chalk.hex('#636e72')('  Update the TOKEN value in your .env file and try again.\n'));
    } else {
        console.error(chalk.hex('#d63031').bold(`\n  ✖ WebSocket error: ${msg}\n`));
    }
    process.exit(1);
});

const BANNER = `
${chalk.hex('#FF6B6B')('   __  __')}${chalk.hex('#FF8E53')('   ____')}${chalk.hex('#FECA57')('   ______')}${chalk.hex('#48DBFB')('   __  __')}${chalk.hex('#FF9FF3')('   ______')}${chalk.hex('#54A0FF')('   ____')}${chalk.hex('#5F27CD')('    ____')}${chalk.hex('#01A3A4')('    __ ')}
${chalk.hex('#FF6B6B')('  / / / /')}${chalk.hex('#FF8E53')('  /  _/')}${chalk.hex('#FECA57')('  / ____/')}${chalk.hex('#48DBFB')('  / / / /')}${chalk.hex('#FF9FF3')(' /_  __/')}${chalk.hex('#54A0FF')('  / __ \\')}${chalk.hex('#5F27CD')('  / __ \\')}${chalk.hex('#01A3A4')('  / / ')}
${chalk.hex('#FF6B6B')(' / /_/ /')}${chalk.hex('#FF8E53')('  / /')}${chalk.hex('#FECA57')('   / __/')}${chalk.hex('#48DBFB')('   / / / /')}${chalk.hex('#FF9FF3')('   / /')}${chalk.hex('#54A0FF')('   / / / /')}${chalk.hex('#5F27CD')(' / / / /')}${chalk.hex('#01A3A4')(' / /  ')}
${chalk.hex('#FF6B6B')('/ __  /')}${chalk.hex('#FF8E53')('  / /')}${chalk.hex('#FECA57')('   / /___')}${chalk.hex('#48DBFB')('  / /_/ /')}${chalk.hex('#FF9FF3')('   / /')}${chalk.hex('#54A0FF')('   / /_/ /')}${chalk.hex('#5F27CD')(' / /_/ /')}${chalk.hex('#01A3A4')(' / /___')}
${chalk.hex('#FF6B6B')('/_/ /_/')}${chalk.hex('#FF8E53')('  \\___/')}${chalk.hex('#FECA57')('  \\____/')}${chalk.hex('#48DBFB')('   \\____/')}${chalk.hex('#FF9FF3')('   /_/')}${chalk.hex('#54A0FF')('    \\____/')}${chalk.hex('#5F27CD')(' \\____/')}${chalk.hex('#01A3A4')('  /_____/')}
`;

const DIVIDER = chalk.hex('#2C3E50')('━'.repeat(90));

function taskIcon(t) {
    switch (t) {
        case TaskType.WATCH_VIDEO:
        case TaskType.WATCH_VIDEO_ON_MOBILE: return '🎬';
        case TaskType.PLAY_ON_DESKTOP: return '🎮';
        case TaskType.STREAM_ON_DESKTOP: return '📡';
        case TaskType.PLAY_ACTIVITY: return '🕹️';
        default: return '❓';
    }
}

function clock(sec) {
    if (sec <= 0) return chalk.hex('#00d2d3').bold('● DONE');
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const parts = [];
    if (h > 0) parts.push(chalk.hex('#feca57')(`${h}h`));
    parts.push(chalk.hex('#ff9f43')(`${m}m`));
    parts.push(chalk.hex('#ee5a24')(`${s}s`));
    return parts.join(' ');
}

function stateLabel(s) {
    switch (s) {
        case 'working': return chalk.hex('#0984e3')('⟳ RUNNING');
        case 'done': return chalk.hex('#00b894')('✔ DONE');
        case 'claimed': return chalk.hex('#6c5ce7')('★ CLAIMED');
        case 'skipped': return chalk.hex('#636e72')('⊘ SKIP');
        case 'failed': return chalk.hex('#d63031')('✖ FAIL');
    }
}

let live = [];
let orbs = null;

function draw(user) {
    console.clear();
    console.log(BANNER);
    console.log(DIVIDER);

    const now = new Date();
    const timeStr = chalk.hex('#dfe6e9')(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
    );

    console.log(
        `  ${chalk.hex('#74b9ff').bold('⦿')} ${chalk.hex('#dfe6e9')('Account:')} ${chalk.hex('#ffeaa7').bold(user.username)} ${chalk.hex('#636e72')('|')} ${chalk.hex('#dfe6e9')('ID:')} ${chalk.hex('#81ecec')(user.id)} ${chalk.hex('#636e72')('|')} ${chalk.hex('#dfe6e9')('Orbs:')} ${chalk.hex('#a29bfe').bold(orbs !== null ? `🔮 ${orbs}` : '...')} ${chalk.hex('#636e72')('|')} ${timeStr}`,
    );

    console.log(DIVIDER);

    const tbl = new Table({
        chars: {
            'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
            'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
            'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
            'right': '│', 'right-mid': '┤', 'middle': '│',
        },
        head: [
            chalk.hex('#636e72')('#'),
            chalk.hex('#dfe6e9').bold('QUEST'),
            chalk.hex('#dfe6e9').bold('TYPE'),
            chalk.hex('#dfe6e9').bold('REWARD'),
            chalk.hex('#dfe6e9').bold('REMAINING'),
            chalk.hex('#dfe6e9').bold('STATUS'),
        ],
        colWidths: [4, 34, 8, 18, 14, 13],
        colAligns: ['center', 'left', 'center', 'center', 'center', 'center'],
        style: {
            border: ['#2d3436'],
            head: [],
            'padding-left': 1,
            'padding-right': 1,
        },
    });

    live.forEach((q, i) => {
        const nameColor = q.state === 'working' ? '#74b9ff' : q.state === 'claimed' ? '#a29bfe' : '#b2bec3';
        tbl.push([
            chalk.hex('#636e72')(`${i + 1}`),
            chalk.hex(nameColor)(q.label.length > 30 ? q.label.slice(0, 28) + '..' : q.label),
            q.taskIcon,
            chalk.hex('#fd79a8')(q.reward),
            clock(q.countdown),
            stateLabel(q.state),
        ]);
    });

    console.log(tbl.toString());

    const working = live.filter((q) => q.state === 'working').length;
    const finished = live.filter((q) => q.state === 'done' || q.state === 'claimed').length;
    const bar = '█'.repeat(finished) + chalk.hex('#2d3436')('░'.repeat(Math.max(0, live.length - finished)));
    console.log(
        `\n  ${chalk.hex('#636e72')('Progress')} ${chalk.hex('#00b894')(bar)} ${chalk.hex('#dfe6e9')(`${finished}/${live.length}`)} ${chalk.hex('#636e72')(`(${working} active)`)}`,
    );

    console.log(`\n  ${chalk.hex('#636e72')('Press')} ${chalk.hex('#dfe6e9').bold('Ctrl+C')} ${chalk.hex('#636e72')('to stop')}`);
}

function report(user, results) {
    console.log(`\n${DIVIDER}`);
    console.log(chalk.hex('#ffeaa7').bold('  ★ EXECUTION REPORT'));
    console.log(DIVIDER);

    const rptTable = new Table({
        chars: {
            'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
            'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
            'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
            'right': '│', 'right-mid': '┤', 'middle': '│',
        },
        head: [
            chalk.hex('#dfe6e9')('QUEST'),
            chalk.hex('#dfe6e9')('TYPE'),
            chalk.hex('#dfe6e9')('RESULT'),
            chalk.hex('#dfe6e9')('REWARD'),
        ],
        colWidths: [34, 8, 12, 20],
        style: { border: ['#2d3436'], head: [] },
    });

    results.forEach((r, i) => {
        const q = live[i];
        if (!q) return;
        if (r.status === 'fulfilled') {
            rptTable.push([
                chalk.hex('#74b9ff')(q.label.slice(0, 30)),
                q.taskIcon,
                chalk.hex('#00b894').bold('SUCCESS'),
                chalk.hex('#ffeaa7')(q.reward),
            ]);
        } else {
            const msg = r.reason?.message?.slice(0, 20) || 'Error';
            rptTable.push([
                chalk.hex('#74b9ff')(q.label.slice(0, 30)),
                q.taskIcon,
                chalk.hex('#d63031').bold('FAILED'),
                chalk.hex('#d63031')(msg),
            ]);
        }
    });

    console.log(rptTable.toString());
    console.log(`\n  ${chalk.hex('#a29bfe').bold(`🔮 Final Orbs: ${orbs ?? '?'}`)}  ${chalk.hex('#636e72')('|')}  ${chalk.hex('#00b894')('✨ All tasks finished')}`);
    console.log(DIVIDER);
}

app.once(
    GatewayDispatchEvents.Ready,
    async ({ data }) => {
        try {
            const bal = await app.getBalance();
            orbs = bal.balance;
        } catch { /* balance fetch is optional; non-critical */ }

        const store = await app.loadQuests();
        const pending = store.pending();

        const unclaimed = store.claimable();
        if (unclaimed.length > 0) {
            await store.grabAllRewards();
        }

        if (pending.length === 0) {
            console.clear();
            console.log(BANNER);
            console.log(DIVIDER);
            console.log(`  ${chalk.hex('#74b9ff').bold('⦿')} ${chalk.hex('#ffeaa7').bold(data.user.username)} ${chalk.hex('#636e72')('|')} ${chalk.hex('#a29bfe')(`🔮 ${orbs ?? '?'} Orbs`)}`);
            console.log(DIVIDER);
            console.log(chalk.hex('#636e72')('\n  No pending quests. All caught up! ✨\n'));

            const allQuests = store.all();
            if (allQuests.length > 0) {
                const summaryTbl = new Table({
                    chars: {
                        'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
                        'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
                        'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
                        'right': '│', 'right-mid': '┤', 'middle': '│',
                    },
                    head: [chalk.hex('#dfe6e9')('Quest'), chalk.hex('#dfe6e9')('Status'), chalk.hex('#dfe6e9')('Reward')],
                    colWidths: [34, 14, 20],
                    style: { border: ['#2d3436'], head: [] },
                });
                allQuests.forEach((q) => {
                    let st = '❓';
                    if (q.isClaimed()) st = chalk.hex('#6c5ce7')('★ Claimed');
                    else if (q.isCompleted()) st = chalk.hex('#00b894')('✔ Done');
                    else if (q.isExpired()) st = chalk.hex('#636e72')('⏰ Expired');
                    else st = chalk.hex('#0984e3')('⏳ Active');
                    summaryTbl.push([chalk.hex('#74b9ff')(q.name.slice(0, 30)), st, chalk.hex('#fd79a8')(q.getRewardLabel())]);
                });
                console.log(summaryTbl.toString());
            }
            return;
        }

        live = pending.map((q) => ({
            id: q.id,
            label: q.name,
            reward: q.getRewardLabel(),
            countdown: q.getRemaining(),
            taskIcon: taskIcon(q.detectTaskType()),
            state: 'working',
        }));

        const ticker = setInterval(() => {
            live.forEach((q) => {
                if (q.state === 'working' && q.countdown > 0) q.countdown--;
                else if (q.state === 'working' && q.countdown <= 0) q.state = 'done';
            });
            draw(data.user);
        }, 1000);

        const results = await Promise.allSettled(
            pending.map((q) => store.execute(q)),
        );

        clearInterval(ticker);

        results.forEach((r, i) => {
            if (!live[i]) return;
            live[i].state = r.status === 'fulfilled' ? 'claimed' : 'failed';
            live[i].countdown = 0;
        });

        try {
            const bal = await app.getBalance();
            const gained = orbs !== null ? bal.balance - orbs : 0;
            orbs = bal.balance;
            if (gained > 0) {
                console.log(chalk.hex('#a29bfe')(`\n  🔮 Orbs gained: +${gained}`));
            }
        } catch { /* final balance fetch is optional; non-critical */ }

        draw(data.user);
        report(data.user, results);
    },
);

app.start();
