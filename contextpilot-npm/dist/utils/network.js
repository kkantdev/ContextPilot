"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalIPAddress = getLocalIPAddress;
const os_1 = __importDefault(require("os"));
const logger_1 = require("./logger");
function getLocalIPAddress() {
    const interfaces = os_1.default.networkInterfaces();
    const candidates = [];
    const ignoreRegex = /^(utun|docker|vboxnet|vmnet|vnic|tun|tap|bridge|veth|tailscale|zerotier|wg|wireguard|lo)/i;
    for (const name of Object.keys(interfaces)) {
        if (ignoreRegex.test(name))
            continue;
        const ifaceList = interfaces[name];
        if (!ifaceList)
            continue;
        for (const iface of ifaceList) {
            const familyStr = String(iface.family);
            const isIPv4 = familyStr === 'IPv4' || familyStr === '4';
            if (isIPv4 && !iface.internal && !iface.address.startsWith('169.254.')) {
                let priority = 10;
                const lowerName = name.toLowerCase();
                // Higher priority for primary physical interfaces (en0 on macOS, wlan0/eth0 on Linux/Android)
                if (lowerName === 'en0' || lowerName === 'wlan0' || lowerName === 'eth0' ||
                    lowerName === 'wi-fi' || lowerName === 'wifi' || lowerName === 'ethernet') {
                    priority = 100;
                }
                else if (lowerName.startsWith('en') ||
                    lowerName.startsWith('wlan') ||
                    lowerName.startsWith('eth')) {
                    priority = 80;
                }
                else if (lowerName.includes('wi-fi') ||
                    lowerName.includes('wifi') ||
                    lowerName.includes('ethernet')) {
                    priority = 80;
                }
                candidates.push({ name, address: iface.address, priority });
            }
        }
    }
    if (candidates.length > 0) {
        // Sort by priority descending
        candidates.sort((a, b) => b.priority - a.priority);
        const selected = candidates[0];
        logger_1.logger.info(`Detected network interface: ${selected.name} (${selected.address})`);
        return selected.address;
    }
    // Fallback to localhost if no active LAN interface is detected
    logger_1.logger.warn('No LAN network interface found; using localhost. A phone will not be able to connect.');
    return '127.0.0.1';
}
//# sourceMappingURL=network.js.map