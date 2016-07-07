const mysql = require('mysql'),
	crypto = require('crypto'),
	fs = require('fs'),
	path = require('path'),
	argv = require('minimist')(process.argv.slice(2)),
	config = require(argv.config || path.join(__dirname, './config.js'));
config.mapDirectory = argv.mapDirectory || path.join(__dirname, './maps');

/**
	hashString returns a sha256 hash of an given string
	@param str String to hash
	@return String hex encoded sha256 hash of the str
**/
function hashString(str){
	let hash = crypto.createHash('sha256');
	hash.update((str || '').toString());
	return hash.digest('hex');
}

// Remove a given file
function removeFile(path){
	return fs.unlinkSync(path);
}

// Write to a given file
function insertFile(path, data){
	return fs.writeFileSync(path, data);
}

/**
	mapQueryResults maps a database query that returns official maps into an object.
	@return object{ content: String, name: String } content representing map data, and name represeting the map's name.
**/
function mapQueryResult(res){
	return { data: res.data, name: res.username + '-' + res.name + '.ronm', hash: hashString(res.data) };
}

/**
	databaseMapList returns a promise that gathers a list of maps from the given database connection 
	@parram connection Object represents an open database connection.
	@return Promise(resolve(object{name: object{ data: String, name: String, hash: String }}))
**/
function databaseMapList(connection){
	return new Promise((resolve, reject) => {
		connection.query(`
			SELECT player.username, level.name, level.data 
			FROM level INNER JOIN player ON player.id = level.author_id
			WHERE level.is_custom = 0
		`, (err, result) => { 
			return err ? reject(err) : resolve(result.map(mapQueryResult).reduce((obj, curr) => { obj[curr.name] = curr; return obj; }, {}));
		});
	});u
}

/**
	mapList returns a promise that gathers a list of maps stored in a given directory and their hashes.	
	@param directory to gather maps from.
	@return Promise(resolve(object{object{ file: String, name: String, hash: String }}))
**/
function mapList(directory){
	return new Promise((resolve, reject) => {
		fs.readdir(directory, (err, files) => {
			if(err) return reject(err);
			
			resolve(
				Promise.all(
					files.map((fname) => path.join(directory, fname)).map(parseMapFile)
				).then((arr) => arr.reduce((obj, curr) => { obj[curr.name] = curr; return obj; }, {}))
			);
		});	
	});	
}

/**
	parseMapFile reads and returns a parsed file given a file path.
	@return Promise(resolve(object{ file: String, name: String, hash: String }))
**/
function parseMapFile(path){
	return new Promise((resolve, reject) => {
		fs.readFile(path, (err, data) => err ? reject(err) : resolve({ file: path, name: path.split('/').pop(), hash: hashString(data) }));
	});	
}

/**
	diffs a given file list and a database map results to create a diff.
	@param local Array of files that are in the local directory.
	@param remote Array of files that are in the database.
	@param excludes Array of file names to not remove from the directory.
	@return Array[object{[file|data]: String, name: String, hash: String, status: [1|-1]}] difference of local and remote.
**/
function diff(local, remote, excludes = ['main_background.ronm']){
	let difference = [];

	// Check local files against remote to see if we should remove, keep the same, or replace.
	Object.keys(remote).forEach((key) => {
		let r = remote[key], l = local[r.name];
		r.status = !l ? 1 : l.hash == r.hash ? 0 : 1;
		
		if(l) l.persistent = true;	
		// Add to diff if not has the same hash.
		if(r.status != 0)
			difference.push(r);
	});

	// add local files that aren't in the remote files.
	return [
		...difference, 
		...Object.keys(local).map((key) => { 
			let l = local[key]; 

			l.status = -1; 
			return l.persistent || excludes.indexOf(l.name.trim()) != -1 ? undefined : l; 
		}).filter((l) => l)
	];
}

let connection = mysql.createConnection(config.database);
connection.connect();

Promise.all([
	databaseMapList(connection),
	mapList(config.mapDirectory)
]).then(([remote, local]) => {
	let difference = diff(local, remote);

	difference.forEach((diff) => {
		console.log("DIFF ==>", diff.name, diff.hash, diff.status);
		if(diff.status == -1)
			removeFile(diff.file);
		else if(diff.status == 1)
			insertFile(path.join(config.mapDirectory, diff.name), diff.data);
	});
}).catch(console.log);
connection.end();
