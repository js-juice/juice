import CustomDom from '../core/Dom/Custom.mjs';
import Request from '../core/HTTP/Request.mjs';
import String from '../core/Util/String.mjs';
import VirtualDom from '../core/VirtualDom/VirtualDom.mjs';
class TableComponent extends CustomDom.HTMLElement {

    config = {
        headings: {},
        columns: {}
    };
    tbody;
    dom={};
    rows = [];
    data = [];
    
    static get style(){
        return {
            ':host': {
               padding: "1rem",
               backgroundColor: "#FFFFFF"
            },
            'header': {
                display: 'block'
            },
            'main': {
                display: 'block'
            },
            '.table': {
              
                overflow: 'hidden'
            },
            'table': {
                width: '100%',
                borderBottom: '1px solid #d2d2d2'
            },
            'tr:nth-child(even) td': {
                background: '#FFFFFF'
            },
            'tr:nth-child(odd) td': {
                background: '#f8f8f8'
            },
            'tr.empty td': {
                textAlign: 'center'
            },
            'th': {
                padding: '0.85rem 1rem',
                position: 'relative',
                textTransform: 'uppercase',
                color: '#FFF',
                fontWeight: 600,
                fontSize: '1rem',
                borderBottom: '1px solid #d2d2d2',
                backgroundColor: '#1a202c'
            },
            'td': {
                padding: '0.9rem 1rem',
                position: 'relative'
            },
            '.align-left': {
                textAlign: 'left'
            },
            '.align-right': {
                textAlign: 'right'
            },
            '.fit': {
                width: '1%',
                padding: '0.85rem 1.5rem',
                whiteSpace: 'nowrap',
                textAlign: 'center'
            },
            'a.button': {
                display: 'inline-block',
                backgroundColor: '#007cc7',
                color: '#FFF',
                textDecoration: 'none',
                padding: '0.5rem 0.8rem',
                borderRadius: '5px',
                textTransform: 'uppercase',
                fontSize: '0.8rem'
            },
            'a.button:hover': {
                backgroundColor: '#0096ed',
                color: '#1a202c'
            },
            'footer': {
                display: 'block'
            }
        };
    }

    static html(){
        return `
        <header>
        </header>
        <main>
            <div class="table">
                <table cellspacing="0" cellpadding="0">
                <tbody></tbody>
                </table>
            </div>
        </main>
        <footer>
            
        </footer>
        `;
    }

    onConnect(){
        const tpl = this.querySelector('template');
        app.log(tpl);
    }

    onReady(){
        const tpl = this.querySelector('template');
        app.log(tpl);
        this.tbody = this.root.querySelector('tbody');
    }

    #makeRow( data, heading=false ){
        const tag = heading ? 'th' : 'td';
        const row = document.createElement('tr');
        for( const key in this.config.columns ){
            if( this.hasColumn(key) ){
                const column = this.config.columns[key];
                app.log(column);
                let value = heading ? column.label : ( data[key] || '' );
                if( !heading && column.format ){
                    value = column.format(value, data);
                }
                const cell = document.createElement(tag);
                cell.className = column.class || key.replace('_', '-');
                cell.innerHTML = value;
                row.appendChild( cell );
            }
        }
        return row;
    }

    hasColumn(key){
        return this.config.columns[key] ? true : false;
    }

    addColumn( key, options={} ){
        const column = {};
        column.key = options.key || key;
        const className = options.class || key.replace('_', '-');
        const classes = [className];
        if( options.align ) classes.push( 'align-'+options.align );
        if( options.fit ) classes.push( 'fit' );
        column.class = classes.join(' ');
        if( options.format ) column.format = options.format;

        column.label = options.label || key;
        this.config.headings[key] = column.label;
        this.config.columns[key] = column;
    }

    clear(){
        while( this.rows.length ){
            const row = this.rows.shift();
            this.data.shift();
            this.tbody.removeChild(row);
        }
        this.update();
    }

    append( data ){
        for(let i=0;i<data.length;i++){
            const row = this.#makeRow( data[i] );
            this.tbody.appendChild( row );
            this.data.push( data[i] );
            this.rows.push( row );
        }
        this.update();
    }

    prepend( data ){
        for(let i=0;i<data.length;i++){
            const row = this.#makeRow( data[i] );
            this.tbody.insertBefore( row, this.rows[0] );
            this.data.unshift( data[i] );
            this.rows.unshift( row );
        }
        this.update();
    }

    update(){
        const columns = Object.keys(this.config.columns);
        if(!this.rows.length){
            this.tbody.appendChild(this.dom.empty);
        }else{
            this.tbody.removeChild(this.dom.empty);
        }
    }

    columns( columns ){
        app.log( 'columns', columns );        
        for( const key in columns ){
            this.addColumn( key, columns[key] );
        }
        if(!this.dom.heading){
            this.dom.heading = this.#makeRow( this.config.headings, true );
            this.tbody.appendChild(this.dom.heading);
        }else{
            this.dom.heading = this.#makeRow( this.config.headings, true );
            this.tbody.removeChild(this.dom.heading);
            if(this.rows.length){
                this.tbody.insertBefore(this.dom.heading, this.rows[0]);
            }else{
                this.tbody.appendChild(this.dom.heading);
            }
        }
    }

    init( options={} ){

        if( options.columns ){
            this.columns( options.columns );
        }

        const columns = Object.keys(this.config.columns);

        if( options.empty ){
            this.config.empty = options.empty;
            const row = document.createElement('tr');
            row.className = 'empty';
            const td = document.createElement('td');
            td.setAttribute('colspan', columns.length );
            td.innerHTML = this.config.empty;
            row.appendChild(td);
            this.dom.empty = row;
        }

        app.log( 'options', options );
        this.update();
    }
}

customElements.define('adq-table', TableComponent );

class TableXHRComponent extends CustomDom.HTMLElement {

    selected = [];
    selectable = true;

    static config = {
        properties: {
            page: {
                linked: true,
                default: 1
            },
            datatype: {
                linked: true
            },
            heading: {
                linked: true
            }
        }
    };

    static get observedProperties(){
        return ['page', 'datatype', 'heading'];
    }

    static get observedAttributes(){
        return ['page', 'datatype', 'heading'];
    }

    static get style(){
        return [{
            ':host': {
               
            },
            'th': {
                padding: '0.3rem 1.5rem',
                backgroundColor: '#333',
                color: '#FFF'
            },
            'td': {
                padding: '0.3rem 1.5rem',
            },
            'tr:nth-child(even) td': {
                  background: '#FFFFFF'
            },
            'tr:nth-child(odd) td': {
                background: '#f8f8f8'
            },
              
            
            '.fit': {
                width: '1%',
                padding: '0rem 1.5rem',
                whiteSpace: 'nowrap',
                textAlign: 'center'
            },
            '.null-value': {
                fontSize: '0.7rem',
                background: '#000',
                color: '#FFF',
                padding: '0 0.3rem',
                borderRadius: '3px'
            },
            'nav': {
                float: 'right'
            },
            'nav a': {
                display: 'inline-block',
                border: '1px solid #d2d2d2',
                height: '35px',
                lineHeight: '35px',
                padding: '0 1rem',
                cursor: 'pointer'
            },
            '.table-wrapper': {

            },
            '.table-wrapper table': {
                width: '100%'
            },
            'footer': {
                borderTop: '2px solid #333',
                paddingTop: '1rem',
                paddingBottom: '2rem'
            }
        }];
    }

    static html(){
        return `
        <header>
            <h3 class="title" ref="title" >${this.heading}</h3>
        </header>
        <main>
            <div ref="table-wrapper" class="table-wrapper"></div>
        </main>
        <footer>
            <nav class="table-pagination">
                <a class="prev" ref="prev"><span>Prev</span></a>
                <a class="next" ref="next" ><span>Next</span></a>
            </nav>
        </footer>
        `;
    }

    constructor(){
        super();
      //  console.log(this);
    }

    parseAttributes( column, schema ){
        const attrs = {};
        attrs.class = column.replace(/[_]/g, '-');

        if(schema.fit) attrs.class += ` fit`;

        if(schema.align) attrs.class += `align-${schema.align}`;

        return attrs;
    }

    renderCell( property, value, row ){

        let content;
        const schema = this.schema[property];

       // console.log(property, schema);

        if( value === null || value === undefined ){
            if( schema.default ){
                if(typeof schema.default == 'function'){
                    content = schema.default( row );
                }else{
                    content = schema.default;
                }
            }else{
                content = VirtualDom.element( 'span', { class: 'null-value'}, ['NULL'] );
            }
        }else{
            content = value+"";
        }

        return VirtualDom.element('td', this.parseAttributes( property, schema ), [ content ] );
    }

    renderRow( record ){

        const row = {
            tag: 'tr',
            children: []
        };

        for( let column of this.columns ){
            row.children.push( this.renderCell( column, record[column], record ) );
        }

        return row;
    }

    renderTable( data ){

        const self = this;
        const schema = this.schema;
        const records = data.records;

        const columns = this.columns;

        const tbody = {
            tag: 'tbody',
            attributes: {},
            children: []
        };

        const header = {
            tag: 'tr',
            children: []
        };

        for( let column of columns ){
          //  console.log(column);
            const label = schema[column].label || column;
            header.children.push( VirtualDom.element('th', this.parseAttributes( column, schema[column] ), [ label ]) );
        }

  

        tbody.children.push( header );

        for( let i=0;i<records.length;i++ ){
            const record = records[i];
            const row = this.renderRow( records[i] );
        

         

            tbody.children.push( row );
        }

        const table = {
            tag: 'table',
            attributes: { cellspacing: 0 },
            children: [ tbody ]
        };

        const dom = VirtualDom.render(table);

        this.ref('table-wrapper').innerHTML = "";
        this.ref('table-wrapper').appendChild( dom );

    }

    initializeDataType(schema){
        const self = this;

        this.columns = Object.keys(schema);

        if(this.selectable){

            this.columns.unshift('select');

            schema.select = {
                fit: true,
                label: {
                    'tag': 'label',
                    'attributes': {},
                    'children': [{
                        'tag': 'input',
                        'attributes': {
                            type: 'checkbox', 
                            value: ''
                        },
                        'children': [],
                        'events': {
                            'click': function(){
                                const checkboxes = self.root.querySelectorAll('.select input[type="checkbox"]');
                                for(let i=0;i<checkboxes.length;i++){
                                    const id = parseInt(checkboxes[i].value);
                                    checkboxes[i].checked = this.checked;
                                    if(this.checked){
                                        if(self.selected.indexOf(id) === -1 )
                                        self.selected.push(id);
                                    }else{
                                        if(self.selected.indexOf(id) !== -1 ){
                                            self.selected.splice( self.selected.indexOf(id), 1 );
                                        }
                                    }
                                }
                                self.dispatchEvent(new CustomEvent('select', {
                                    detail: {
                                        asArray: self.selected,
                                        asString: self.selected.join(',')
                                    }
                                }));
                            }
                        }
                    }]
                },
                default: function( row ){
                    const attrs = {
                        type: 'checkbox', 
                        value: row.id
                    };
    
                    if( self.selected.indexOf(row.id) !== -1 ){
                        attrs.checked = 'checked';
                    }
                    return {
                        'tag': 'label',
                        'attributes': {},
                        'children': [{
                            'tag': 'input',
                            'attributes': attrs,
                            'children': [],
                            'events': {
                                'click': function(){
                                    const id = parseInt(this.value);
                                    if(this.checked){
                                        self.selected.push(id);
                                    }else{
                                        self.selected.splice( self.selected.indexOf(id), 1 );
                                    }
                                   // console.log(self.selected);
                                    self.dispatchEvent(new CustomEvent('select', {
                                        detail: {
                                            asArray: self.selected,
                                            asString: self.selected.join(',')
                                        }
                                    }));
                                }
                            }
                        }]
                    }
                }
                };
        }

        this.schema = schema;

        

    }

    request(){


        if(!this.datatype) return false;

        const req = new Request(`/content/table/${this.datatype}`);

        req.get({
            page: this.page
        }).then((resp) => {
           // console.log(resp);
            if( resp.code === 200 ){
                if(!this.schema) this.initializeDataType(resp.data.schema);
                this.renderTable(resp.data);
            }
        }).catch((e) => {
            console.error(e);
        });
    }
 
     onConnect(){
        const tpl = this.querySelector('template');
        app.log(tpl);
        this.request();
     }

     onReady(){
        this.ref('next').addEventListener('click', (e) => {
            this.page++;
            this.request();
        });

        this.ref('prev').addEventListener('click', (e) => {
            if(this.page > 1) this.page--;
            this.request();
        });
     }

     onPropertyChanged( prop, old, value ){
        switch(prop){
            case 'datatype':
                this.schema = null;
                this.selected = [];
                this.columns = [];
                this.request();
            break;
            case 'page':
                
            break;
        }
    }

}

customElements.define('table-xhr', TableXHRComponent );