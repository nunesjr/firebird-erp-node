const { execFile } = require('child_process');

const liberarRdp = (req, res, next) => {
    const ip = req.body.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const ipRegex = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    if (!ip || !ipRegex.test(ip)) {
        console.warn(`🚫 Tentativa de liberação de RDP com IP inválido: ${ip}`);
        const err = new Error('IP inválido fornecido.');
        err.status = 400;
        return next(err);
    }

    const ruleName = `01-RDP-${ip.replace(/\./g, '-')}`;
    const command = 'powershell.exe';

    const addArgs = [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-Command', `New-NetFirewallRule -DisplayName '${ruleName}' -Direction Inbound -Protocol TCP -LocalPort 3389 -RemoteAddress ${ip} -Action Allow`
    ];

    execFile(command, addArgs, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Erro ao executar comando PowerShell para IP ${ip}: ${error.message}`);
            if (stderr) {
                console.error(`Stderr do PowerShell para IP ${ip}: ${stderr}`);
            }
            const err = new Error('Falha ao aplicar regra no firewall.');
            return next(err);
        }
        console.log(`✔ IP ${ip} liberado no firewall com sucesso. Output: ${stdout}`);
        res.json({ success: true, message: `IP ${ip} liberado para RDP.` });

        const TWELVE_HOURS_IN_MS = 12 * 60 * 60 * 1000;
        console.log(`⏳ Agendando remoção da regra '${ruleName}' para o IP ${ip} em 12 horas.`);

        setTimeout(() => {
            const removeArgs = [
                '-NoProfile',
                '-ExecutionPolicy', 'Bypass',
                '-Command', `Remove-NetFirewallRule -DisplayName '${ruleName}' -Confirm:$false`
            ];

            execFile(command, removeArgs, (removeError, removeStdout, removeStderr) => {
                if (removeError) {
                    console.error(`❌ Erro ao remover regra PowerShell '${ruleName}' para IP ${ip}: ${removeError.message}`);
                    if (removeStderr) {
                        console.error(`Stderr da remoção PowerShell para IP ${ip}: ${removeStderr}`);
                    }
                } else {
                    console.log(`🗑️ Regra '${ruleName}' para o IP ${ip} removida com sucesso após 12 horas.`);
                }
            });
        }, TWELVE_HOURS_IN_MS);
    });
};

module.exports = {
    liberarRdp
};