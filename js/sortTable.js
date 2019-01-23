(function(µ,SMOD,GMOD,HMOD,SC){

	let Table=GMOD("gui.Table");

	SC=SC({
		TableConfig:"gui.TableConfig.Select",
		form:"gui.form",
		action:"gui.actionize",
		org:"Organizer",
		fuzzy:"fuzzySearch",
	});

	let SortTable=µ.Class(Table,{
		constructor:function(tableConfig)
		{
			this.mega(tableConfig);

			this.organizer=new SC.org();
			this.sortKey=null;
		},
		setData:function(data)
		{
			this.organizer.clear();
			this.add(data);
			this.getTable();
		},
		add:function(data)
		{
			this.mega(data);

			this.organizer.addAll(data);

		},
		getTable:function()
		{
			this.mega();

			this.tableHeader=this.tableElement.firstElementChild;
			this.tableBody=this.tableHeader.nextElementSibling;

			this.tableHeader.addEventListener("click",this._onHeaderClick.bind(this));


			return this.tableElement;
		},
		updateTable:function()
		{

			while(this.tableBody.firstChild) this.tableBody.removeChild(this.tableBody.firstChild);

			let order=this.sortKey!=null?this.organizer.getSort(this.sortKey):this.organizer.getValues();
			order.forEach(entry=>this.tableBody.appendChild(this.dataDomMap.get(entry)));
		},
		_onHeaderClick:function(event)
		{
			let columnElement=event.target;
			let index=Array.from(columnElement.parentNode.children).indexOf(columnElement);
			if(index==-1) return ;
			let column=this.tableConfig.columns[index];
			if(!column.sortValue) return;

			if(columnElement.classList.contains("ASC"))
			{
				columnElement.classList.remove("ASC");
				columnElement.classList.add("DESC");
				this.sortKey="!"+index;
			}
			else if(columnElement.classList.contains("DESC"))
			{
				columnElement.classList.remove("DESC");
				this.sortKey=null;
			}
			else
			{
				columnElement.classList.add("ASC");
				this.sortKey=index;
			}
			if(this.sortKey!=null&&!this.organizer.hasSort(this.sortKey)) this.organizer.sort(this.sortKey,SC.org.orderBy(column.sortValue,this.sortKey[0]=="!"));
			this.updateTable();
		}
	});

	SMOD("SortTable",SortTable);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);