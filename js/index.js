(function(µ,SMOD,GMOD,HMOD,SC){

	let rq=GMOD("request");

	SC=SC({
		SortTable:"SortTable"
	});

	let parseDuration=function(duration)
	{
		let match=duration.match(/(?:(\d+)\s*hr\.\s*)?(?:(\d+)\s*min\.\s*)?(?:(\d+)\s*sec\.\s*)?/);
		if(!match||match[1]==""&&match[2]=="") return NaN;
		return (match[1]||0)*36E5+(match[2]||0)*6E4+(match[3]||0)*1E3;
	}


	let getTimeString=function(time)
	{
		let h=Math.floor(time/36E5)
		let m=Math.floor(time%36E5/6E4);
		let s=Math.floor(time%6E4/1000);
		return ("000"+h).slice(-4)+":"+("0"+m).slice(-2)+":"+("0"+s).slice(-2);
	};

	rq.json("rest/list/data")
	.then(function(data)
	{
		let table=new SC.SortTable();
		let tableConfig=table.tableConfig;
		tableConfig.addColumn({
			name:"name",
			styleClass:"anime_title",
			fn:(cell,data)=>cell.innerHTML=`<img src="${data.anime_image_path}"><a href="https://myanimelist.net${data.anime_url}">${data.anime_title}</a>`,
			sortValue:data=>data.anime_title.toLowerCase()
		});
		tableConfig.addColumn({
			name:"score",
			styleClass:"user_score",
			fn:(cell,data)=>cell.textContent=data["user_score"],
			sortValue:data=>data.user_score
		});
		tableConfig.addColumn({
			name:"genres",
			styleClass:"genres",
			fn:(cell,data)=>cell.textContent=data["genres"],
			sortValue:data=>data.genres.length
		});
		tableConfig.addColumn({
			name:"episodes",
			styleClass:"anime_num_episodes",
			fn:(cell,data)=>cell.textContent=data["anime_num_episodes"],
			sortValue:data=>data.anime_num_episodes
		});
		tableConfig.addColumn({
			name:"duration",
			styleClass:"duration",
			fn:(cell,data)=>cell.textContent=data["duration"],
			sortValue:data=>parseDuration(data.duration)
		});
		tableConfig.addColumn({
			name:"total duration",
			styleClass:"total_duration",
			fn:(cell,data)=>
			{
				let totalDuration=parseDuration(data["duration"])*data.anime_num_episodes;
				cell.textContent=getTimeString(totalDuration);
				cell.title=totalDuration||data.duration;
			},
			sortValue:data=>parseDuration(data["duration"])*data.anime_num_episodes
		});

		table.add(data);

		document.body.appendChild(table.getTable());
	});

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);