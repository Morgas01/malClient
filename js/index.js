(function(µ,SMOD,GMOD,HMOD,SC){

	let rq=GMOD("request");

	SC=SC({
		Table:"gui.OrganizedTable",
		ORG:"Organizer",
		Config:"Config",
		form:"gui.form",
		remove:"array.remove",
		fuzzy:"fuzzySearch"
	});

	let parseDuration=function(duration)
	{
		if(!duration) return NaN;
		let match=duration.match(/(?:(\d+)\s*hr\.\s*)?(?:(\d+)\s*min\.\s*)?(?:(\d+)\s*sec\.\s*)?/);
		if(!match||match[1]==""&&match[2]=="") return NaN;
		return (match[1]||0)*36E5+(match[2]||0)*6E4+(match[3]||0)*1E3;
	};


	let getTimeString=function(time)
	{
		let h=Math.floor(time/36E5)
		let m=Math.floor(time%36E5/6E4);
		let s=Math.floor(time%6E4/1000);
		return ("000"+h).slice(-4)+":"+("0"+m).slice(-2)+":"+("0"+s).slice(-2);
	};

	let getRangeGroup=function(duration,groups)
	{
		return groups.filter((g,i,a)=>i==0||duration>a[i-1].value).slice(-1).map(g=>g.key);
	};

	rq.json("rest/list/data")
	.then(function(data)
	{
	let table=new SC.Table();
		let tableConfig=table.tableConfig;
		tableConfig.addColumn({
			name:"name",
			styleClass:"anime_title",
			fn:(cell,data)=>
			{
				cell.innerHTML=`<!--img src="${data.anime_image_path}"--><a href="https://myanimelist.net${data.anime_url}">${data.anime_title}</a>`;
				cell.dataset.column="anime_title";
			}
		});
		tableConfig.addColumn({
			name:"score",
			styleClass:"user_score",
			fn:(cell,data)=>
			{
				cell.textContent=data.user_score;
				cell.dataset.column="user_score";
			}
		});
		tableConfig.addColumn({
			name:"genres",
			styleClass:"genres",
			fn:(cell,data)=>
			{
				cell.textContent=data.genres;
			}

		});
		tableConfig.addColumn({
			name:"episodes",
			styleClass:"anime_num_episodes",
			fn:(cell,data)=>
			{
				cell.textContent=data["anime_num_episodes"];
				cell.dataset.column="anime_num_episodes";
			}
		});
		tableConfig.addColumn({
			name:"duration",
			styleClass:"duration",
			fn:(cell,data)=>
			{
				cell.textContent=data["duration"];
				cell.dataset.column="duration";
			}
		});
		tableConfig.addColumn({
			name:"total duration",
			styleClass:"total_duration",
			fn:(cell,data)=>
			{
				cell.dataset.column="total_duration";
				let duration=parseDuration(data.duration);
				if(isNaN(duration)||isNaN(data.anime_num_episodes))
				{
					cell.textContent="N/A";
				}
				else
				{
					let totalDuration=duration*data.anime_num_episodes;
					cell.textContent=getTimeString(totalDuration);
					cell.title=totalDuration;
				}
			}
		});

		table.addGroup("genres","genres")
		.addGroup("duration",data=> getRangeGroup(parseDuration(data.duration),[
			{key:"3min",value:180E3},
			{key:"5min",value:300E3},
			{key:"15min",value:900E3},
			{key:"30min",value:180E4},
			{key:">30min"}
		]))
		.addGroup("total duration",data=> getRangeGroup(parseDuration(data.duration)*data.anime_num_episodes,[
			{key:"3H",value:108E5},
			{key:"6H",value:216E5},
			{key:"22H",value:792E5},
			{key:">22H"}
		]))
		.addGroup("episode count",data=> getRangeGroup(data["anime_num_episodes"],[
			{key:"8",value:8},
			{key:"15",value:15},
			{key:"34",value:34},
			{key:"54",value:54},
			{key:">54"}
		]))
		.add(data);

		requestAnimationFrame(()=>requestAnimationFrame(()=>
		{
			let start=performance.now();
			table.addSort("title",SC.ORG.attributeSort("anime_title"))
			.addSort("score",SC.ORG.attributeSort("user_score"))
			.addSort("episodes",SC.ORG.attributeSort("anime_num_episodes"))
			.addSort("duration",SC.ORG.orderBy(data=>parseDuration(data.duration)))
			.addSort("total duration",SC.ORG.orderBy(data=>parseDuration(data.duration)*data.anime_num_episodes));
			µ.logger.debug("sort time: "+(performance.now()-start));
		}));

		let form;
		let formContainer=document.getElementById("searchContainer");
		let updateForm=function()
		{
			if(form) form.remove();

			let searchConfig=new SC.Config.parse({
				sort:/*[*/
					{
						column:{
							type:"select",
							values:["","title","score","episodes","duration","total duration"]
						},
						direction:{
							type:"select",
							values:["ascending","descending"],
							default:"descending"
						}
					}
				/*]*/,
				filter:{
					search:{
						type:"string"
					},
					genres:{
						...table.getGroupParts("genres").sort().reduce((obj,genre)=>(obj[genre]=false,obj),{})
					},
					ranges:{
						duration:{
							type:"select",
							multiple:true,
							values:["3min","5min","15min","30min",">30min"]
						},
						["total duration"]:{
							type:"select",
							multiple:true,
							values:["3H","6H","22H",">22H"]
						},
						["episode count"]:{
							type:"select",
							multiple:true,
							values:["8","15","34","54",">54"]
						}
					}
				}
			});

			for(let [genre,model] of searchConfig.get(["filter","genres"]))
			{
				model.fieldFirst=true;
			}
			form=SC.form(searchConfig);
			formContainer.appendChild(form);
		};
		updateForm();

		document.getElementById("tableWrapper").appendChild(table.getTable());

		formContainer.addEventListener("formChange",function(event)
		{
			let path=event.detail.path.slice();
			let pathStep=path.shift();
			switch(pathStep)
			{
				case "sort":
					switch(event.detail.key)
					{
						case "column":
							table.setSort(event.detail.value,form.getConfig().get(["sort","direction"]).get()==="descending");
							break;
						case "direction":
							table.setSort(table.getSort(),event.detail.value=="descending");
							break;
					}
					break;
				case "filter":
					pathStep=path.shift();
					switch(pathStep)
					{
						case "genres":
							let parts=Object.entries(form.getConfig().get(event.detail.path).get())
							.filter(([k,v])=>v)
							.map(([k,v])=>k);
							table.setGroup("genres",parts,false);
							break;
						case "ranges":
							table.setGroup(event.detail.key,event.detail.value,true);
							break;
						default:
							if(event.detail.key==="search")
							{
								let search=form.getConfig().get(event.detail.path).get(event.detail.key).get();
								if(!table.hasFilter(search))
								{
									let matcher=SC.fuzzy.scoreFunctions.misc.query(search);
									table.addFilter(search,d=>matcher(d.anime_title)>0)
								}
								table.setFilter(search);
								break;
							}
							return;
					}
					break;
				default:
					return;
			}
			table.updateTable();
		});

		document.getElementById("updateBtn").addEventListener("click",function()
		{
			this.disabled=true;
			rq.json("rest/list/update")
			.then(data=>
			{
				table.clear();
				table.add(data);
				table.updateTable();
				updateForm();
			},error=>alert(JSON.stringify(error,null,"\t")))
			.always(()=>
			{
				this.disabled=false;
			})
		})

	},alert);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);