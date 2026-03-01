import CustomDom from '../core/Dom/Custom.mjs';
import Collection from '../core/Obj/Collection.mjs';
import VirtualDom from '../core/VirtualDom/VirtualDom.mjs';
import { Tpl, tpl } from '../core/HTML/Template.mjs';
import setupCSS from '!../../sass/component--setup.scss?toString';
import _ from 'lodash';
export class PackageIssue {

    static NoFiles(){
        return {
            code: 1,
            title: "Your files are empty.",
            description: "You cannot finalize a package with no files added.",
            level: 1
        }
    }

    static ContributorWait( contributor ){
        return { 
            code: 2, 
            contributor_id: contributor.id,
            title: 'Waiting for Contributor.',
            description: `You cannot finalize this package until ${contributor.user.name} writes their contributor package to the blockchain.`,  
            level: 2
        }
    }

    static ContributorSend( contributor ){
        return { 
            code: 3, 
            contributor_id: contributor.id,
            title: 'Send Contributor Invite.',
            description: `Assign files to ${contributor.user.name} and then send the invite.`,  
            level: 2
        }
    }

    static FileImportConflict(count){
        return { 
            code: 4, 
            title: 'Satisfy File Conflicts',
            description: `File import resulted in "${count}" conflicts. You must resolve these issues before continuing`,  
            level: 2
        }
    }

    static DuplicateFile(file){
        return { 
            code: 5, 
            title: 'File Exists',
            description: `File named "${file.name}" already exists either rename this file or replace it.`,  
            level: 2
        }
    }

    static ValidationError(issue){
        const verr =  { 
            code: 10, 
            description: `There were errors trying to validate some of your files please review each error below and make the necessary updates to validate all package files.`,  
            level: 2,
            subissues: [issue]
        }

        Object.defineProperty(verr, 'title', {
            get: () => {
                return `${verr.subissues.length} Issues Found During Validation`;
            }
        });

        return verr;
    }

    static ReviewNameChange( file ){
        return { 
            code: 11, 
            instance: file,
            title: 'Possible Name Change',
            description: `Found a file named "${file.name}" .`,  
            level: 2
        }
    }

    static ReviewHashChange( file ){
        return { 
            code: 12, 
            instance: file,
            title: 'Possible Fingerprint Change',
            description: `A file named "${file.name}" exists in this package however the content of the validation file is different.`,  
            level: 2
        }
    }

    constructor(){

    }
}


class IssueBag extends Collection{
    
}



class IssueComponent extends CustomDom.HTMLElement {

    static tag = 'm-issue';

    static config = {
        properties: {
            title: {},
            descrtiption: {},
            level: { linked: true, default: 1 },
            instance: { type: 'object' }
        }
    }

    scope;
    static get observedProperties(){
        return ['instance', 'level', 'issue'];
    }

    static get observedAttributes(){
        return ['level', 'issue'];
    }

    subissues = [];


    static get style(){
        return [setupCSS, {
            ':host': {
                borderTop: '1px solid #d2d2d2',
                alignSelf: 'flex-end',
                flex: '0 0 auto',
                minWidth: '366px',
                width: '100%',
            },
            '.component--html': {
                position: 'relative',
                width: '100%',
                height: '100%',
                minWidth: '200px'
                
            },
            '.info': {
                padding: '5px 10px'
            },
            '.title': {
                fontWeight: 'bold',
                marginBottom: '0.4rem'
            },
            '.description': {
                fontSize: '0.9rem'
            },
            '.info[level="1"]': {
                borderLeft: '5px solid #D41111'
            },
            '.info[level="2"]': {
                borderLeft: '5px solid #ee6300'
            },
            '.info[level="3"]': {
                borderLeft: '5px solid #FFAB1A'
            },
            '.sub-issues':{
                margin: '1rem 0',
                padding: 0,
                border: '1px solid #d2d2d2'
            },
            '.sub-issue':{
                display: 'block',
                padding: '5px',
                borderBottom: '1px solid #d2d2d2',
                overflow: 'hidden',
            },
            '.sub-issue:last-child':{
                borderBottom: '0'
            },
            '.sub-issue .title': {
                fontSize:'0.7rem',
                fontWeight: 'bold',
                marginBottom: '0.25rem'
            },
            '.sub-issue .description': {
                fontSize:'0.7rem',
                marginBottom: '0.2rem'
            },
            '.sub-issue .icon': {
                paddingRight: '5px'
            },
            '.sub-issue a': {
                display:'block',
                position:'absolute',
                width: '100%',
                height: '100%',
                background: '#D41111',
                left:0,
                top:'100%',
                transition: 'top 0.4s ease',
                color: '#FFF',
                cursor: 'pointer'
            },
            '.sub-issue a span': {
                display:'block',
                position:'absolute',
            },
            '.sub-issue:hover a': {
                top: 0
            }
        }];
    }

    list;

    addSubIssue(issue){
        this.instance.subissues.push(issue);
        app.log('ADDING SUB ISSUE');
        issue.instance.on('verified', ( prop, value ) => {
            
                for(let i=0;i<this.subissues.length;i++){
                    if( this.subissues[i] === issue ){
                        this.subissues.splice(i,1);
                        this.render();
                        if(this.subissues.length == 0){
                            this.list.removeIssue({code: this.instance.code });
                        }
                        break;
                    }
                }
            
        });
        this.subissues.push(issue);
        this.render();
    }

    viewTargetFile(e, i){
        app.tabs.select('files');
        setTimeout(() => {
            this.subissues[i].scrollIntoView( );
        }, 500 );
    }

    static html(){

        const { repeat } = Tpl;

        return `
            <div class="info" level="${this.instance.level}" >
                <div class="title">
                    ${this.instance.title}
                </div>
                <div class="description">
                    ${this.instance.description}
                </div>
                ${ this.subissues.length ? '<ul class="sub-issues">' : '' }
                ${ repeat( 
                    this.subissues, 
                    (issue) => issue.code, 
                    (issue, index) => `
                    <li class="sub-issue flex-h">
                        <div class="icon flex-static h-100 rel">
                        <icon-fs name="${issue.instance.name}" height="25" ></icon-fs>
                        </div>
                        <div>
                        <div class="title">${issue.title}</div>
                        <div class="description">${issue.description}</div>
                        </div>
                        <a click="viewTargetFile(${index})"><span class="centered">View File</span></a>
                    </li>
                    `
                ) }
                ${ this.subissues.length ? '</ul>' : '' }
            </div>
        `;
    }

    onReady(){
        this.level = 1
    
    }

    onPropertyChanged( prop, old, value ){
        switch(prop){
            case 'instance':
            if(value.subissues) this.addSubIssue( value.subissues.shift() );
            break;
        }
    }

}

customElements.define(IssueComponent.tag, IssueComponent );

class IssueListComponent extends CustomDom.HTMLElement{

    static tag = 'm-issue-list';

    static config = {
        properties: {
            count: { linked: true, default: 0 },
        }
    }

    static get observedProperties(){
        return ['count'];
    }

    static get observedAttributes(){
        return ['count'];
    }

    get state(){
        return this.getAttribute('state');
    }

    set state(v){
        this.setAttribute('state',v);
    }

    issues = [];

    static get style(){
        return [{
            ':host': {
                position: 'absolute',
                minHeight: '200px',
                bottom: '1rem',
                right: '100%',
                display: 'block',
                zIndex: -1,
                
                boxShadow: 'rgba(0, 0, 0, 0.07) 0px 1px 1px, rgba(0, 0, 0, 0.07) 0px 2px 2px, rgba(0, 0, 0, 0.07) 0px 4px 4px, rgba(0, 0, 0, 0.07) 0px 8px 8px, rgba(0, 0, 0, 0.07) 0px 16px 16px'
            },
            '::slotted(m-issue)': {
                borderTop: '1px solid #d2d2d2',
                borderLeft: '1px solid #d2d2d2',
                borderRight: '1px solid #d2d2d2',
                alignSelf: 'flex-end',
            },
            '::slotted(m-issue:last-child)': {
                borderBottom: '1px solid #d2d2d2'
            },
            '.component--html': {
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            },
            '.tab': {
                position: 'absolute',
                width: '20px',
                height: '200px',
                background: '#D41111',
                borderTopLeftRadius: '15px',
                overflow: 'hidden',
                bottom:0,
                left: 0,
                transform: 'translateX(-100%)',
                cursor: 'pointer'
            },
            '.tab .tri.before': {
                position: 'absolute',
                display:'block',
                width: 0,
                height: 0,
                opacity: 0.2,
                borderStyle: 'solid',
                borderWidth: '65px 20px 0 0',
                borderColor: '#FFFFFF transparent transparent transparent',
                top:0,
                left: 0
            },
            '.tab .tri.after': {
               position: 'absolute',
                display:'block',
                width: 0,
                height: 0,
                opacity: 0.2,
                borderStyle: 'solid',
                borderWidth: '65px 0 0 20px',
                borderColor: 'transparent transparent transparent #FFFFFF',
                bottom:0,
                left: 0
            },
            '.tab .accent': {
                position: 'absolute',
                width: '17px',
                height: '30%',
                background: '#a30a0a',
                top: '50%',
                right:0,
                transform: 'translateY(-50%)',
                borderTopLeftRadius: '8px',
                borderBottomLeftRadius: '8px',
                zIndex: 100
            },
            '.tab .accent:before': {
                content: `""`,
                position: 'absolute',
                display:'block',
                width: 0,
                height: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                borderStyle: 'solid',
                borderWidth: '6px 10px 6px 0',
                borderColor: 'transparent #FFFFFF transparent transparent',
                left:0
            },
            '.hamburger': {
                width: '20px',
                height: '20px',
                position: 'absolute',
                bottom: '5px',
                left: 0,
                display:'none'
            },
            '.hamburger:before': {
                content: `""`,
                width: '4px',
                height: '20px',
                display: 'block',
                borderRadius: '2px',
                background: '#FFF',
                position: 'absolute',
                left: '4px'
            },
            '.hamburger:after': {
                content: `""`,
                width: '4px',
                height: '20px',
                display: 'block',
                borderRadius: '2px',
                background: '#FFF',
                position: 'absolute',
                right: '4px'
            },
            '.collapser': {
                position: 'relative',
                width: 0,
                overflow: 'hidden',
                transition: 'width 0.5s ease',
                background: '#FFF',
                minHeight: '230px',
                border: '1px solid #d2d2d2',
                flex: '0 0 auto'
            },
            '.collapser .tri.after': {
                position: 'absolute',
                zIndex:0,
                bottom: 0,
                left: 0,
                width: 0,
                height: 0,
                opacity: 0.1,
                borderStyle: 'solid',
                borderWidth: '30px 0 0 300px',
                borderColor: 'transparent transparent transparent #333'
            },
            '.collapser .tri.before': {
                position: 'absolute',
                zIndex:0,
                top: 0,
                right: 0,
                width: 0,
                height: 0,
                opacity: 0.05,
                borderStyle: 'solid',
                borderWidth: '0 500px 50px 0',
                borderColor: 'transparent #333 transparent transparent '
            },
            '.collapser .list': {
                position: 'relative',
                zIndex:10,
                maxHeight: '400px',
                minHeight: 'calc( 100% - 2rem )',
                background: 'rgba(255,255,255,0.75)',
                display: 'flex',
                flexDirection: 'column',
                
                overflow: 'auto'
            },
            '.if-empty, .if-one':{
                padding: '1rem',
                textAlign: 'center',                
                display:'none'
            },
            '.if-empty .pill, .if-one .pill':{
                background: 'rgba(0,0,0,0.5)',
                lineHeight: '20px',
                borderRadius: '10px',
                margin: '0 auto',
                color: '#FFF',
                display: 'inline-block',
                padding: "0 1rem"
            },
            ':host([state="idle"]) .tab': {
                background: '#1a202c',
                width:'15px'
            },
            ':host([state="idle"]) .tab .accent': {
                background: '#000',
                width:'15px'
            },
            ':host([state="idle"]) .tab .accent:before': {
                opacity: 0.4,
                left:'4px'
            },
            ':host([state="idle"]) .tab .tri.before': {
                borderWidth: '140px 10px 0 0'
            },
            ':host([state="idle"]) .tab .tri.after': {
                borderWidth: '140px 0 0 10px'
            },
            ':host([state="open"]) .collapser': {
                padding: '1rem',
                width: '500px'
            },
            ':host([state="open"]) .hamburger': {
                display: 'block'
            },
            ':host([state="open"]) .tab .accent:before': {
                left: '2px',
                borderWidth: '6px 0 6px 10px',
                borderColor: 'transparent transparent transparent #FFFFFF',
            },
            ':host([count="0"]) .if-empty': {
                display:'block'
            },
            ':host([count="1"]) .if-one': {
                display:'block'
            }
        }];
    }

    static html(){
        return `
            <div class="tab" ref="tab">
                <div class="tri before"></div>
                <div class="accent"></div>
                <div class="hamburger">

                </div>
                <div class="tri after"></div>
            </div>
            <div class="collapser collapsed">
            <div class="tri before" ></div>
                <div class="tri after" ></div>
                <div class="list">
                <slot ref="slot"></slot>
                <div class="if-empty">
                    <div class="pill">We cant find any issues,<br><strong>Ready to finalize!</strong></div>
                </div>
                <div class="if-one">
                    <div class="pill">Just 1 issue left.</div>
                </div>
                </div>
                
            </div>
        `;
    }

    findIssues( match ){
        let issues = [];
        let nodes = this.ref('slot').assignedNodes();
        for(let i=0;i<nodes.length;i++){
            let isMatch = true;
            for( let prop in match ){
                if( nodes[i].instance[prop] !== match[prop] ){
                    isMatch = false;
                    break;
                }
            }
            if( isMatch ){
                issues.push( nodes[i] );
            }
        }
        return issues;
    }


    removeIssue( match ){
        let nodes = this.ref('slot').assignedNodes();
        for(let i=0;i<nodes.length;i++){
            let isMatch = true;
            for( let prop in match ){
                if( nodes[i].instance[prop] !== match[prop] ){
                    isMatch = false;
                    break;
                }
            }
            if( isMatch ){
                this.removeChild(nodes[i]);
            }
        }
    }

    addIssue( issueInstance ){
        const issue = document.createElement('m-issue');
        issue.instance = issueInstance;
        issue.list = this;
        this.appendChild(issue);
        this.count++;
    }

    setIssues( issues ){
        this.count = 0;
        this.innerHTML = '';
        for(let i=0;i<issues.length;i++){
            this.addIssue(issues[i]);
        }
    }

    onReady(){
        this.state = 'idle';

        this.ref('tab').addEventListener('click', () => {
            if(this.state == 'open'){
                this.state = 'idle';

            }else{
                this.state = 'open';

            }
        });

        this.ref('slot').addEventListener('slotchange', () => {
            let nodes = this.ref('slot').assignedElements();
            this.count = nodes.length;
            this.dispatchEvent(new CustomEvent('itemchange', { detail: nodes.length }));
        });
    }

}

customElements.define(IssueListComponent.tag, IssueListComponent );

class IssueBtnComponent extends CustomDom.HTMLElement{

    static tag = 'm-issues';
    issues = [];

    static config = {
        emitter: true
    }

    static get style(){
        return [{
            ':host': {
                dispplay: 'block',                
            },
            '.component--html': {

            },
            '.if-none, .if-has': {
                display: 'none'
            }, 
            '.button': {
                background:'#d2d2d2',
                borderRadius: '8px',
                borderTopRightRadius: '1rem',
                display: 'flex',
                flexDirection: 'row',
                padding: '5px',
                cursor: 'pointer'
            },
            '.button.no-issues': {
                background: '#73C322'
            },
            '.button.has-issues': {
                background: '#D41111',
                borderBottomLeftRadius:'0',
                borderBottomRightRadius:'0',
            },
            '.button.no-issues .if-none': {
                display: 'block'
            },
            '.button.has-issues .if-has': {
                display: 'block'
            },
            '.button .status': {
                display: 'block',
                lineHeight: '40px',
                background: '#FFF',
                width:'40px',
                borderRadius: '5px'
            },
            '.button .label': {
                display: 'block',
                lineHeight: '40px',
                fontSize:'24px',
                paddingLeft: '1rem',
                fontWeight: 'bold',
                textAlign: 'center',
                color: '#FFF'
            },
            '.button .label .if-has': {
            },
            '.checkmark': {
                color: '#73C322',
                position: 'relative',
                height: '40px',
                width: '40px'
            },
            '.button .status .if-has': {
                textAlign: 'center',
                width:'40px',
                fontSize:'24px',
                fontWeight: 'bold'
            },
            '.click-msg': {
                background: '#1a202c',
                color: '#FFF',
                textTransform: 'uppercase',
                padding:'3px',
                borderBottomLeftRadius:'8px',
                borderBottomRightRadius:'8px',
                textAlign: 'center',
                fontSize: '0.8rem'
            },
            '.click-msg.no-issues': {
                display: 'none'
            }
        }];
    }

    static html(){

        setTimeout(() => {
            this.ref('status-icon').setAttribute('state', 'success');
        }, 200 );

        return `
        <div ref="button" class="button ${this.issueCount > 0 ? 'has-issues' : 'no-issues' } ">
            <div class="status">
                <div ref="no-issues-count" class="if-none checkmark" ><status-icon ref="status-icon" size="40"></status-icon></div>
                <div ref="count" class="if-has" >${this.issueCount}</div>
            </div>
            <div class="label" ref="label">
                <div ref="no-issues-label" class="if-none" >Ready</div>
                <div ref="has-issues-label" class="if-has" >Issue${this.issueCount > 1 ?'s':''}</div>
            </div>    
        </div>
        <div class="click-msg ${this.issueCount > 0 ? 'has-issues' : 'no-issues' }">Click to View</div>
        `;
    }

    onReady(){

        this.issueCount = 0;

        this.list = document.querySelector('m-issue-list');
        
        this.ref('button').addEventListener('click', () => {
            this.list.state = 'open';
        }, false );

        this.list.addEventListener('itemchange', (e) => {
            this.issueCount = e.detail;
            if(this.issueCount == 0){
                this.emit('issue-count', this.issueCount );
            }else{
                this.emit('issue-count', this.issueCount );
            }
            this.render();
        });

        
    }

    addIssue( issue ){
        //app.log('ADD ISSUE', issue );

        if( issue.code > 10 ){
            const existingValidationIssue = this.list.findIssues({ code: 10 });
            app.log(existingValidationIssue);
            if(existingValidationIssue.length){
                app.log('Found Existing Validation Issue', existingValidationIssue.subissues);
                existingValidationIssue[0].addSubIssue(issue);
                this.render();
                return true;
            }else{
                issue = PackageIssue.ValidationError( issue );
            }
            
        }   

        this.issues.push(issue);
        this.render();
        this.list.addIssue(issue);
        
    }

    check(){

        if(this.package){

            if( this.package.files && !this.package.files.length ){
                this.addIssue(PackageIssue.NoFiles());
            }

            //Check if Contributor Finalized
            if( this.package.contributors && this.package.contributors.length ){

                this.list.removeIssue({code: 2});
                this.list.removeIssue({code: 3});

                for(let c=0;c<this.package.contributors.length;c++){
                    const contributor = this.package.contributors[c];
                    if( contributor.invited_at == null && contributor.finalized_at == null){
                        this.addIssue(PackageIssue.ContributorSend(contributor));
                        continue;
                    }
                    if( contributor.finalized_at == null ){
                        this.addIssue(PackageIssue.ContributorWait(contributor));
                    }
                }
            }

        }
    }

    validation( ){

    }


    fileConflict( count ){
        this.list.removeIssue({code: 4});
        if(count == 0){
            return;
        }else{
            this.addIssue( PackageIssue.FileImportConflict(count) );
        }
    }

    setPackage($package){
        this.package = $package;
 

        this.package.contributors.on('change', (instance, prop, value) => {
            let issues;
            switch(prop){
                case 'added':
                    this.check();
                break;
                case 'deleted':
                    this.list.removeIssue({ contributor_id: instance.id });
                break;
                case 'finalized_at':
                    issues = this.list.findIssues({code: 2, contributor_id: instance.id });
                    if(issues.length){
                        this.list.removeIssue({ code: 2, contributor_id: instance.id });
                    }
                break;
                case 'invited_at':
                    issues = this.list.findIssues({code: 3, contributor_id: instance.id });
                    if(issues.length){
                        this.list.removeIssue({ code: 3, contributor_id: instance.id });
                    }
                break;
            }
            
            if(!this.package.contributors.length){

                //Contributors EMPTY
                this.list.removeIssue({code: 2});
                this.list.removeIssue({code: 3});
            }
        });

        this.package.files.on( 'change', (instance, prop, value) => {

            switch(prop){
                case 'added':
                    this.check();
                break;
                case 'deleted':
                    //this.list.removeIssue({ contributor_id: instance.id });
                break;
                case 'verified':
                    if( this.list.findIssues({code: 5}) ){

                    }
                break;
            }

            if(this.package.files.length){
                this.list.removeIssue({code: 1});
            }else{
                if( !this.list.findIssues({code: 1}) ){
                    this.addIssue(PackageIssue.NoFiles());
                }
            }
        });

        this.check();
    }
}

customElements.define(IssueBtnComponent.tag, IssueBtnComponent );