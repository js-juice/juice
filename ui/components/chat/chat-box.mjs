import Component from "../../component.mjs";

export default class ChatBox extends Component.HTMLElement {
    static tag = "chat-box";

    static allowedStates = ["hidden", "collapsed", "expanded"];

    static networkStates = ["disconnected", "connecting", "connected", "error"];

    maxMessageLength = 150;

    currentMessageCount = 0;

    static config = {
        tag: "chat-box",
        properties: {
            title: {
                type: "string",
                default: "Chat Box"
            },
            state: {
                type: "string",
                default: "hidden",
                allowed: ChatBox.allowedStates
            },
            networkState: {
                type: "string",
                default: "disconnected",
                allowed: ChatBox.networkStates
            },
            visible: {
                type: "boolean",
                default: false
            }
        }
    };

    static get observed() {
        return {
            all: []
        };
    }

    static html(data = {}) {
        return `
        <div id="chatbox">
            <header>
                <div class="col-1">
                <h2><slot name="title">${this.title}</slot></h2>
                </div>
                <div class="col-2">
                    <a id="close" event="click::toggleChat">&times;</a>
                    
                </div>
            </header>
            <main>
                <div id="messages"></div>
            </main>
            <footer>
                <div id="submit-contaioner">
                <button id="send">Send</button>
                </div>
                <div id="ta-container">
                <textarea></textarea>
                <div id="char-count">${this.currentMessageCount}/${this.maxMessageLength}</div>
                </div>
                
            </footer>
        </div>
        <a id="chat-button" part="button" href="#chatbox" event="click::toggleChat">
            <slot name="button-bg"></slot>
            <slot name="button-title">Chat Now</slot>
        </a> 
        
        <slot></slot>
        `;
    }

    static get style() {
        return [
            {
                ":host": {
                    position: "fixed",
                    bottom: "2rem",
                    right: "1rem",
                    zIndex: 10000,
                    maxWidth: "80vh",
                    opacity: 0
                },
                "#chatbox": {
                    position: "absolute",
                    width: "350px",
                    padding: "1rem",
                    display: "none",
                    background: "#FFF",
                    borderRadius: "0.5rem",
                    border: "1px solid #d2d2d2",
                    boxShadow: "0px 4px 10px 2px rgba(0, 0, 0, 0.15)",
                    bottom: 0,
                    right: 0
                },
                "#chatbox > header": {
                    display: "flex",
                    flexDirection: "row",
                    display: "block",
                    width: "100%"
                },
                "#chatbox > header": {
                    display: "flex",
                    flexDirection: "row",
                    paddingBottom: "0.5rem"
                },
                "#chatbox > header #close": {
                    display: "block",
                    width: "25px",
                    height: "25px",
                    lineHeight: "25px",
                    textAlign: "center",
                    border: "1px solid #d2d2d2",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "20px"
                },
                "#chatbox > header #close:hover": {
                    background: "#bd1717",
                    color: "#FFFFFF"
                },
                "#chatbox > header .col-1": {
                    width: "100%",
                    paddingRight: "1rem"
                },
                "#chatbox > header h2": {
                    fontSize: "1.2rem",
                    margin: 0
                },
                "#chatbox > header .col-2": {
                    display: "flex",
                    flexDirection: "row"
                },
                "#chatbox > main": {
                    minHeight: "200px",
                    border: "1px solid #d2d2d2",
                    background: "#f3f3f3",
                    marginBottom: "1rem"
                },
                "#chatbox > footer": {
                    position: "relative",
                    display: "flex",
                    flexDirection: "row",
                    paddingBottom: "0.5rem",
                    width: "100%"
                },
                "#chatbox > footer #ta-container": {
                    flex: "0 1 auto",
                    position: "relative",
                    width: "100%"
                },
                "#chatbox > footer textarea": {
                    border: "1px solid #d2d2d2",
                    minWidth: "100%",
                    minHeight: "35px",
                    height: "100%",
                    padding: "5px"
                },
                "#chatbox > footer textarea:focus": {
                    outline: 0
                },
                "#chat-button": {
                    position: "absolute",
                    display: "block",
                    color: "#FFF",
                    textAlign: "center",
                    height: "100%",
                    width: "100%"
                },
                "#html.show #chatbox": {
                    display: "block"
                },
                "#html.show #chat-button": {
                    display: "none"
                },
                "#submit-contaioner": {
                    marginRight: "0"
                },
                "#submit-contaioner button": {
                    height: "100%",
                    minHeight: "30px",
                    background: "linear-gradient(181.2955deg, #165ec2 0%, #0c3872 100%)",
                    color: "#FFF",
                    borderTopLeftRadius: "0.5rem",
                    borderBottomLeftRadius: "0.5rem",
                    cursor: "pointer",
                    padding: "0 1rem"
                },
                "#char-count": {
                    position: "absolute",
                    right: "5px",
                    bottom: "-15px",
                    fontSize: "11px"
                },
                'slot[name="button-bg"]': {
                    display: "block",
                    position: "absolute",
                    bottom: 0,
                    width: "100%",
                    height: "100%"
                },
                'slot[name="button-bg"]::slotted(img)': {
                    display: "block",
                    position: "absolute",
                    width: "100%",
                    height: "auto",
                    zIndex: 10
                },
                'slot[name="button-title"]': {
                    display: "block",
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)"
                }
            }
        ];
    }

    toggleChat() {
        const visible = !this.visible;
        this.ref("html").classList[visible ? "add" : "remove"]("show");
        this.visible = visible;
    }

    onFirstConnect() {}

    onPropertyChanged(name, oldValue, newValue) {}
}

customElements.define(ChatBox.tag, ChatBox);
