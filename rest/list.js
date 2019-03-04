(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		crawler:require.bind(null,"./../lib/crawler"),
		File:"File",
		FileUtil:"File/util",
		errorSerializer:"errorSerializer",
		group:"group",
		niwaWorkDir:"niwaWorkDir"
	});

	let storageFile=new SC.File(SC.niwaWorkDir).changePath("work/"+worker.context+"/listData.json");

	let saveListDataToFile=SC.group(function()
	{
		let writeData=JSON.stringify(SC.crawler.data);
		let p=SC.FileUtil.rotateFile(storageFile,2);
		p.then(()=>µ.logger.info("rotated file"),err=> µ.logger.error("failed to rotate dbFile "+storageFile.getAbsolutePath(),err));

		return p.then(()=> storageFile.write(writeData))
		.then(
			()=>µ.logger.debug("saved list data "+storageFile.getAbsolutePath()),
			(err)=> µ.logger.error("failed to save list data "+storageFile.getAbsolutePath(),err)
		);
	},3E2,3E5);

	let runningUpdate=null;
	module.exports={
		update:function()
		{
			if(!runningUpdate)
			{
				µ.logger.info("update list");
				let startDate=new Date();
				runningUpdate=SC.crawler.updateList()
				.then(function()
				{
					SC.crawler.removeOldEntries(startDate);
					µ.logger.info("save list");
					return saveListDataToFile();
				})
				.then(function()
				{
					return Promise.all(Object.values(SC.crawler.data).map(entry=>
						SC.crawler.updateEntry(entry).then(saveListDataToFile)
					))
					.then(function()
					{
						runningUpdate=null;
						return Object.values(SC.crawler.data);
					});
				});
			}
			return runningUpdate;
		},
		data:function()
		{
			return Object.values(SC.crawler.data);
		}
	};

	µ.logger.info("check list");
	storageFile.exists()
	.then(function()
	{
		µ.logger.info("load list");
		return storageFile.read().then(JSON.parse);
	},()=>µ.logger.info("no list"))
	.then(function(loadedData)
	{
		if(loadedData)
		{
			Object.assign(SC.crawler.data,loadedData);
			µ.logger.info("list loaded");
		}
	});

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);