#!/usr/bin/env node
var fs = require('fs'),
	path = require('path'),
	archiver = require('archiver'); 

var RESOURCE_FOLDER = "/var/www/html/Release", VERSION_FILE = "/var/www/html/version.json", OUTPUT_ARCHIVE = "/var/www/html/RoN.zip", 
	CONTENT_FOLDER = path.join(RESOURCE_FOLDER, 'data/resources'), VERSION_TAG = path.join(path.join(RESOURCE_FOLDER, 'data/'), 'version.rond');
	
function datesEqual(a, b) {
    return !(a > b || b > a);
}

function compare(version, directoryPath, level){
	if(isNaN(level) || typeof level != "number" || level < 0) level = 0;
	var files = fs.readdirSync(directoryPath), differences = [];
	
	for(var i in files){
		var file = path.join(directoryPath, files[i]), stats = fs.lstatSync(file), latest = version[file];
		stats.mtime = "" + stats.mtime;
		
		if(file == VERSION_TAG) continue;
		else if(stats.isDirectory()) differences = differences.concat(compare(version, file, level + 1));
		else if(latest === undefined) differences.push({name: file, mtime: stats.mtime});
		else if(!datesEqual(latest.mtime, stats.mtime)){
			differences.push({name: file, mtime: stats.mtime});
			version[file].persistent = true;
		}else version[file].persistent = true;
	}
	
	if(level == 0){
		for(var i in version){
			if(version[i].mtime != 0 && version[i].persistent != true)
				differences.push({ name: i, mtime: 0 });
			
			delete version[i].persistent;
		}
	}
	
	return differences;
}

function incrementTag(versionTag){
	return versionTag + 1;
}

function saveChanges(version){
	fs.writeFileSync(VERSION_TAG, version.version, 'utf-8');
	var archive = archiver.create('zip', {});
	var writer = fs.createWriteStream(OUTPUT_ARCHIVE);
	archive.directory(RESOURCE_FOLDER, '');
	archive.pipe(writer);
	writer.on('close', function(){
		fs.unlinkSync(VERSION_TAG);
		
		function update(directory){
			var files = fs.readdirSync(directory);
			
			for(var i in files){
				var file = path.join(directory, files[i]), stat = fs.lstatSync(file);
			
				if(stat.isDirectory()) update(file);
				else version.files[file].mtime = "" + stat.mtime;
			}
		}
		update(CONTENT_FOLDER);
		fs.writeFileSync(VERSION_FILE, JSON.stringify(version), 'utf-8');
	});
	archive.finalize();
}

function readVersion(err, data){
	var version = err != null ? {version: 0, files: {}} : JSON.parse(data), differences = compare(version.files, RESOURCE_FOLDER);
	
	if(differences.length != 0){
		version.version = incrementTag(version.version);
		
		for(var i in differences){
			var difference = differences[i];
			
			difference.version = version.version;
			version.files[difference.name] = { mtime: difference.mtime, version: difference.version };
		}
		
		console.log(differences);
		saveChanges(version);
	}
}

fs.readFile(VERSION_FILE, readVersion);