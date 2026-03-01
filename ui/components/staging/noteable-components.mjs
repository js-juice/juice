import CustomDom from '../core/Dom/Custom.mjs';
import setupCSS from '!../../sass/setup.scss?toString';
import formsCSS from '!../../sass/component--forms.scss?toString';
import noteableCSS from '!../../sass/component--noteable.scss?toString';
import DateUtil from '../core/Util/Date.mjs';
import Maldelo from '../maldelo/Core.mjs';

const Note = Maldelo.model('Note');
const api = new Maldelo.Api();
class NoteableNoteComponent extends CustomDom.HTMLElement {

    static tag = 'noteable-note';

    static Model = Note;

    static config = {
        emitter: true,
        properties: {
            ['user-id']: {
                linked: true,
                type: 'number'
            },
            ['uuid']: {
                linked: true
            },
            label: {
                linked: true
            },
            ['button-label']:{

            },
            message: {

            },
            note: {

            }
        }
    }

    static get observedProperties(){
        return ['user-id', 'uuid', 'label', 'note'];
    }

    static get observedAttributes(){
        return ['user-id', 'uuid', 'label'];
    }

    static get style( ){
        return [ noteableCSS, setupCSS, formsCSS ];
    }

    static html( data ){


        let owner = false;
        const actions = [];

        if( data['user-id'] == app.user.id ){
            actions.push({ ref: 'delete', label: 'Delete', fn: 'delete' });
            actions.push({ ref: 'edit', label: 'Edit', fn: 'edit' });
            owner = true;
        }else{
            actions.push({ ref: 'reply', label: 'Reply', fn: 'reply' });
        }

        return `
        <div ref="note" class="note ${owner ? 'owner' : 'reader' } flex-h">
            <div class="note-user" >
                <user-avatar user-id="${data['user-id']}" size="40" info-hover ></user-avatar>
            </div>
            <div class="message w-100">
                <div class="float-r" ><slot name="created">${data.created}</slot></div>
                <div class="note-created"><slot name="author-name" >${data.username}</slot></div>
                <div ref="message-area" class="message-txt"><slot name="message">${data.message}</slot></div>
            </div>
        </div>
        <div class="actions">
            <ul>
            ${ actions.map((action) => { return `<li><a class="${action.ref}" ref="${action.ref}" click="${action.fn}" >${action.label}</a></li>` } ).join(' ') }
            </ul>
        </div>
        <slot name="reply-form"></slot>
        <div class="replies">
        <slot name="replies"></slot>
        </div>
        `;
    }

    edit(){

        const txtState = this.querySelector('[slot="message"]').innerText;

        this.ref('note').classList.add('editing');
        const messageTxtArea = document.createElement('div');
        messageTxtArea.className = 'message-editor flex-h';
        const messageField = document.createElement('div');
        messageField.className = 'message-editor-field w-100';
        const messageEditorSubmit = document.createElement('div');
        messageEditorSubmit.className = 'message-editor-submit flex-v';

        const messageEditorSubmitTop = document.createElement('div');
        messageEditorSubmitTop.className = 'submit-top-space h-100 flex-all';
        const messageEditorSubmitBottom = document.createElement('div');
        messageEditorSubmitBottom.className = 'submit-bottom flex-static';

        const messageSubmit = document.createElement('input');
        messageSubmit.value = 'Save';
        messageSubmit.type = 'submit';
        messageSubmit.className = 'message-submit sm rounded';

        messageEditorSubmit.appendChild(messageEditorSubmitTop);
        messageEditorSubmit.appendChild(messageEditorSubmitBottom);
        messageEditorSubmitBottom.appendChild(messageSubmit);

        const ta = document.createElement('textarea');
        
        ta.innerHTML = txtState;
        messageField.appendChild(ta);

        messageTxtArea.appendChild(messageField);
        messageTxtArea.appendChild(messageEditorSubmit);

        ta.addEventListener('input', () => {
            this.querySelector('[slot="message"]').innerText = ta.value;
        }, false );

        messageSubmit.onclick = () => {
            const editedText = ta.value;
            const loaderRing = document.createElement('loader-ring');
            loaderRing.setAttribute('avtive', '');
            const parent =  messageSubmit.parentElement;
            parent.removeChild(messageSubmit);
            parent.appendChild(loaderRing);
            this.model.message = editedText;
            this.model.save().then((resp) => {
                this.querySelector('[slot="message"]').innerText = editedText;
                this.ref('note').classList.remove('editing');
                this.ref('message-area').removeChild(messageTxtArea);
            }).catch((e) => {
                app.log(e);
            });
        }

        this.ref('message-area').appendChild(messageTxtArea);
    }

    delete(){

        const confirm = document.createElement('confirm-box');
        confirm.setAttribute('type', 'slide');
        confirm.setAttribute('question', 'Are you sure you want to delete this note?');
        confirm.setAttribute('description', 'This action is permanent and cannot be undone.');
        confirm.setAttribute('label-cancel', 'Cancel');
        confirm.setAttribute('label-accept', 'Delete Note');
        
        confirm.on('cancel', ( close ) => {
            close();
        })

        confirm.on('confirm', ( close ) => {
            confirm.spin();
            this.model.delete().then(( resp ) => {
                if( resp.code == 200 ){
                    this.parentNode.removeChild(this);
                }
                close();
            }).catch((e) => {
                app.log(e);
                close();
            });
        });


        confirm.target( this.ref('note'), 'before' );
        
    }

    reply(){
        app.log('reply note');
        const replyForm = document.createElement('noteable-form');
        replyForm.setAttribute('slot', 'reply-form');
        replyForm.setAttribute('user-id', app.user.id);
        replyForm.setAttribute('noteable-id', this.model.id);
        replyForm.setAttribute('noteable-type', 'Note');
        replyForm.setAttribute('reply', '');
        replyForm.target = this.ref('replies');
        this.appendChild(replyForm);
    }

    onPropertyChange( prop, old, value ){
        if( prop == 'note' ){

        }
    }
   
    onCreate(){
        const noteUuid = this.getAttribute('uuid');
        if( app.data.notes ){
            for(let i=0;i<app.data.notes.length;i++){
                if( app.data.notes[i].uuid == noteUuid ){
                    this.note = app.data.notes[i];
                    this.model = new Note( app.data.notes[i] );
                }
            }
        }
    }

    setNote( data ){

    }

    onReady(){
        const self = this;

        function fillData( data ){
            app.log(data);
            const created = document.createElement('span');
            created.setAttribute('slot', 'created');
            created.innerText = data.created_at;
            const author = document.createElement('span');
            author.setAttribute('slot', 'author-name');
            author.innerText = data.user.name;
            const message = document.createElement('span');
            message.setAttribute('slot', 'message');
            message.innerText = data.message;

            self['user-id'] = data.user_id;
            self.render();
        }

        if( !this.model ){
            const noteUuid = this['uuid'];
            this.model = new Note(noteUuid);
            this.model.get();
        }else{
            fillData(this.model);
        }
        
    }

}

customElements.define(NoteableNoteComponent.tag, NoteableNoteComponent );

class NotesComponent extends CustomDom.HTMLElement {
    static tag = 'noteable-notes';

    static config = {
        emitter: true,
        properties: {
        
        }
    }

    load( notes ){
        app.log(notes);
        this.notes = Note.Collection();

        this.notes.on('insert', (instance, i) => {
            const noteDom = document.createElement('noteable-note');
            noteDom.model = instance;
            this.appendChild(noteDom);
        });

        notes.map(n => this.notes.push(n) )

        app.log(this.notes);

    }

    onPropertyChange( prop, old, value ){
        switch(prop){
            case 'notes':

            break;
        }
    }
}

customElements.define(NotesComponent.tag, NotesComponent );

class NoteableFormComponent extends CustomDom.HTMLElement {

    static tag = 'noteable-form';

    static config = {
        emitter: true,
        properties: {
            ['user-id']: {
                linked: true,
                type: 'number'
            },
            ['noteable-id']: {
                type: 'number',
                linked: true
            },
            ['noteable-type']: {
                type: 'string',
                linked: true
            },
            type: {
                type: 'string',
                default: 'note'
            },
            urgent: {
                type: 'boolean',
                default: 0
            },
            prefill: {
                type: 'string'
            },
            disable: {
                type: 'boolean',
                linked: true
            },
            'submit-label': {
                linked: true,
                default: 'Save Note'
            }
        }
    }

    static get observedProperties(){
        return ['user-id', 'noteable-id', 'disable', 'noteable-type', 'prefill', 'type', 'urgent', 'label', 'target', 'submit-label'];
    }

    static get observedAttributes(){
        return ['user-id', 'noteable-id', 'disable', 'noteable-type', 'type', 'urgent', 'label', 'target', 'submit-label'];
    }

    static get style( ){
        return [ setupCSS, formsCSS, {
            '.field.type-textarea': {
                marginBottom: 0
            },
            ':host([reply]) .component--html': {
                marginLeft: '80px',
                maxWidth: 'calc(100% - 80px)'
            }
        } ]
    }

    static html( data ){
        const isReply = this.hasAttribute('reply');
        const userId = data['user-id'] || app.user.id;
        let classes = 'initready';

        if( !this.disabled && this.prefill !== '')
            classes = 'initready';

        return `
        <form id="form--noteable-${this._index}" class="${classes}" ref="form">
            <input name="user_id" type="hidden" value="${this['user-id'] || userId}">
            <input name="noteable_id" type="hidden" value="${this['noteable-id']}">
            <input name="noteable_type" type="hidden" value="App\\Models\\${this['noteable-type']}">
            <input name="type" type="hidden" value="${this.type || 'note'}">
            <input name="urgent" type="hidden" value="${this.urgent || 0}">
            <div class="fields">
                <div class="field type-textarea">
                <div class="status">
                    <status-icon size="16.25" state="success"></status-icon>
                    <div class="bg"></div>
                </div>
                    <label ref="label">${isReply?'Message Reply':'Message'}</label>
                    <textarea name="message" ref="message" required >${this.prefill}</textarea>
                </div>
            </div>
            <div class="flex-h">
                <div class="flex-static">
                    <user-avatar user-id="${this['user-id']}" size="40"  ></user-avatar>
                </div>
                <div class="w-100"> </div>
                <div class="flex-static">
                    <div class="field type-submit">
                        <button type="submit" class="rounded loader" >
                            <div class="flex-h">
                                <div class="icon">
                                    <loader-ring size="30" bg="rgba(255,255,255,0.3)"></loader-ring> 
                                </div>
                                <div class="label">${isReply?'Send Reply':this['submit-label']}</div>
                            </div>
                        </button>
                    </div>
                </div>
        </form>
        `;
    }

    createNote( note ){


        const created = document.createElement('span');
        created.setAttribute('slot', 'created');
        created.innerText = DateUtil.format( note.created_at.split('T').join(' '), 'm/d/Y h:i:s A');
        const author = document.createElement('span');
        author.setAttribute('slot', 'author-name');
        author.innerText = note.user.name;
        const message = document.createElement('span');
        message.setAttribute('slot', 'message');
        message.innerText = note.message;
        

        const el = document.createElement('noteable-note');
        el.setAttribute('uuid', note.uuid );
        el.setAttribute('user-id', note.user_id );
        el.appendChild(created);
        el.appendChild(author);
        el.appendChild(message);

        if(this._beforeCreate) 
        el = this._beforeCreate(el);

        if(this.target){

            if(this.target.querySelector('.package-notes-empty')){
                const emptyBlock = this.target.querySelector('.package-notes-empty');
                emptyBlock.parentNode.removeChild(emptyBlock);
            }
            this.target.appendChild(el);

        }

        this.emit('note-created', el );
    }

    beforeCreate( fn ){
        this._beforeCreate = fn;
    }

    initializeForm(){

        let form = this.ref('form');
        if(this.hasAttribute('reply')) this.label = "Message Reply";
        
        
        const note = new Note();
        
        note.fill({
            user_id: this['user-id'],
            noteable_id: this['noteable-id'],
            noteable_type: `App\\Models\\${this['noteable-type']}`,
            type: 'note'
        });

        //form.clear();
        form = note.bindForm( form );
        form.setDefault();
        
        if(form.input('message'))
        form.input('message').value = '';
        //form.input('message').value = '';
        form.override( ( data, e ) => {
            note.message = data.message;
            note.save().then( (resp) => {
                if( resp.code == 201 ){
                    
                    app.data.notes.push(resp.data);
                    this.createNote(resp.data);
                    this.initializeForm();
                }
            });
        });
        

        if( !this.target && this.hasAttribute('target') ){
            this.target = document.querySelector(this.getAttribute('target'));
        }
    }

    

    onReady(){

        this.initializeForm();
    }

    compileData(){
        return this;
    }

    onAttributeChange( prop, old, value ){
        
    }

    onPropertyChange( prop, old, value ){
        app.log('notable prop',prop, old, value );
        if( prop == 'label' ){
            this.ref('label').innerHTML = value;
        }else if(prop == 'prefill'){
            this.ref('message').innerHTML = value;
        }else if(prop == 'disable'){
            app.log('Notable Form Ready', value);
            this.form.disabled = value ? true : false;
        }
    }

}

customElements.define( NoteableFormComponent.tag, NoteableFormComponent );
