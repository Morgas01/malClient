(function(µ,SMOD,GMOD,HMOD,SC){

	const ENTRY_EXPIRE_PERIOD=2592e6 // 30 days
	const REQUEST_DELAY=300;

	SC=SC({
		Promise:"Promise",
		URL:require.bind(null,"url"),
		errorSerializer:"errorSerializer"
	});

	let listData={};

	let timerPromise=SC.Promise.resolve();

	let baseUrl="https://myanimelist.net/animelist/Morgas/load.json?airing_status=2&order=-15&order2=1&status=6";

	let requestUrl=function(url)
	{
		let promise=timerPromise.then(()=>
		{
			µ.logger.debug("requestUrl: "+url);
			return new SC.Promise(function(signal)
			{
				let options=SC.URL.parse(url);
				let protocol=require(options.protocol.slice(0,-1)||"http");
				options.rejectUnauthorized=false;
				protocol.get(options,function(response)
				{
					let data="";
					response.on("data",function(chunk)
					{
						data+=chunk;
					});
					response.on("error",function(e)
					{
						signal.reject(SC.errorSerializer(e));
					});
					response.on("end",function()
					{
						if(response.statusCode!==200) signal.reject({text:data});
						else signal.resolve(data);
					});
				})
				.on("error",function(e)
				{
					signal.reject(SC.errorSerializer(e));
				})
				.on("timeout",function()
				{
					this.abort();
					signal.reject({message:"searchTimeout"});
				});
			});
		});
		timerPromise=promise.always(()=>new Promise(rs=>setTimeout(rs,REQUEST_DELAY)));
		return promise;
	};

	let dateToTimestamp=function(date){return date.getUTCFullYear()+","+date.getUTCMonth()+","+date.getUTCDate()+","+date.getUTCHours()+","+date.getUTCMinutes()+","+date.getUTCSeconds()+","+date.getUTCMilliseconds()};
	let timestampToDate=function(timestamp){return new Date(Date.UTC.apply(Date,timestamp.split(",")))};

	/*** list ***/
	let updateList=function()
	{
		µ.logger.info("update list");
		return updateListPart();
	};

	let updateListPart=function(offset=0)
	{
		µ.logger.info("load list part "+offset);
		return requestUrl(baseUrl+"&offset="+offset)
		.then(function(data)
		{
			data=JSON.parse(data);
			for(let entry of data)
			{
				if(entry.status==6)
				{
					setListData(entry);
				}
			}
			if(data.length>0) return updateListPart(offset+data.length);
		});
	};

	let setListData=function(data)
	{
		if(!listData[data.anime_id])listData[data.anime_id]={};
		let entryData=listData[data.anime_id];
		data.last_list_update=dateToTimestamp(new Date());
		Object.assign(entryData,data);
	};

	/*** entry ***/
	let checkUpdateEntry=function(data)
	{
		return !data.last_entry_update||(Date.now())-timestampToDate(data.last_entry_update)>ENTRY_EXPIRE_PERIOD;
	};
	let updateEntry=function(data)
	{
		let now=new Date();
		if(!checkUpdateEntry(data))
		{
			µ.logger.info("entry not expired"+data.anime_url);
			return Promise.resolve("not expired");
		}
		µ.logger.info("load list entry "+data.anime_url);
		return requestUrl("https://myanimelist.net"+data.anime_url.replace(/(\/anime\/\d+\/)(.+)/,(match,g1,g2)=>g1+encodeURIComponent(g2)))
		.then(function(html)
		{
			let duration=(html.match(/Duration:<\/span>\s*([^\r\n]+?)\s*[\r\n]/)||[])[1];
			let user_score=Number((html.match(/Score:<\/span>[^>]+>([\d\.]+)/)||[])[1]);
			let genreRegEx=/genre[^"]+"\stitle="([^"]+)/g
			let genres=[]

			let match;
			while(match=genreRegEx.exec(html))
			{
				genres.push(match[1])
			};

			data.duration=duration;
			data.user_score=user_score;
			data.genres=genres;
			data.last_entry_update=dateToTimestamp(now);

			return {duration,user_score,genres};
		});
	};

	let removeOldEntries=function(startDate)
	{
		if(!startDate) return;
		for(let key of Object.keys(listData))
		{
			let last_list_update=timestampToDate(listData[key].last_list_update);
			if(last_list_update<startDate)
			{
				µ.logger.info("remove list entry "+listData[key].anime_title)
				delete listData[key];
			}
		}
	};

	module.exports={
		data:listData,
		updateList,
		checkUpdateEntry,
		updateEntry,
		removeOldEntries
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);