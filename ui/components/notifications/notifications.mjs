import { Notifier } from "./notifier.mjs";

// UI/service adapter. Persistence and transport remain the host application's responsibility.
export default class Notifications {
    constructor({ flasher, list, icon, tab, count, markRead, clearAll } = {}) {
        this.flasher = flasher || document.querySelector(Notifier.tag) || document.body.appendChild(document.createElement(Notifier.tag));
        this.dom = {
            list: list || document.querySelector(".notification-list"),
            icon: icon || document.querySelector(".icon.notification"),
            tab: tab || document.querySelector(".tab.notifications"),
            count: count || document.querySelector(".icon.notification .count"),
        };
        this.persistence = { markRead, clearAll };
        this.sent = new Set();
        this.items = new Map();
        this.updateCount();
    }
    notify(options) {
        if (!options || typeof options !== "object") return;
        if (options.list || options.realtime) {
            if (options.list) this.insert(options.list);
            if (options.realtime) return this.realTimeMessage(options.realtime);
            return;
        }
        return this.flasher.notify(options);
    }
    realTimeMessage(message, id = message?.id) {
        if (!message || (id != null && this.sent.has(String(id)))) return;
        const notice = this.notify({
            title: message.caption ?? message.title,
            content: message.message ?? message.content,
            icon: message.icon,
            status: message.status === "fail" ? "error" : message.status ?? message.type ?? "info",
            duration: message.manual ? 0 : (message.duration ?? 10) * 1000,
            progress: typeof message.progress === "number" ? message.progress / 100 : null,
            audio: message.audio,
        });
        if (id != null) this.sent.add(String(id));
        return notice;
    }
    insert(notification) {
        if (!notification || notification.id == null) return;
        const id = String(notification.id);
        const data = { ...notification, ...notification.data };
        let row = this.items.get(id);
        if (this.dom.list) {
            if (!row) {
                row = document.createElement("li");
                row.dataset.notificationId = id;
                this.items.set(id, row);
                this.dom.list.prepend(row);
            }
            const message = document.createElement("span");
            message.textContent = data.message || "";
            const read = document.createElement("button");
            read.type = "button"; read.textContent = "Mark read";
            const mark = async (url) => {
                read.disabled = true;
                try { await this.markRead(id, url); }
                catch (error) {
                    read.disabled = false;
                    this.notify({ title: "Could not mark notification read", content: error.message, status: "error" });
                }
            };
            read.addEventListener("click", () => mark());
            row.replaceChildren(message, read);
            if (data.action_url) {
                const url = new URL(data.action_url, document.baseURI);
                if (["http:", "https:"].includes(url.protocol)) {
                    const action = document.createElement("a");
                    action.href = url.href; action.textContent = data.action_text || "View";
                    action.addEventListener("click", (event) => { event.preventDefault(); void mark(url.href); });
                    row.append(action);
                }
            }
        }
        this.updateCount();
        if (data.rtm) this.realTimeMessage(data.rtm, id);
        return row;
    }
    updateCount() {
        this.count = this.dom.list?.querySelectorAll("li").length || 0;
        if (this.dom.count) { this.dom.count.textContent = String(this.count); this.dom.count.setAttribute("data-count", this.count); }
        this.dom.icon?.setAttribute("title", `${this.count || "No"} New Notifications`);
        this.dom.icon?.classList.toggle("has-notifications", this.count > 0);
        this.dom.tab?.classList.toggle("has-notifications", this.count > 0);
    }
    async markRead(id, url) {
        // A rejected callback leaves the notification visible for retry.
        if (this.persistence.markRead) await this.persistence.markRead(id);
        const row = this.items.get(String(id)) || [...(this.dom.list?.children || [])].find(item => item.dataset.notificationId === String(id) || item.id === `notification-${id}`);
        row?.remove(); this.items.delete(String(id)); this.updateCount();
        if (url) {
            const target = new URL(url, document.baseURI);
            if (["http:", "https:"].includes(target.protocol)) window.location.assign(target.href);
        }
    }
    async clearAll() {
        if (this.persistence.clearAll) await this.persistence.clearAll();
        this.dom.list?.replaceChildren(); this.items.clear(); this.updateCount();
    }
}
