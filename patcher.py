#!/usr/bin/python2.7
import requests
import os
import sys
import time

class Patcher():
    def fetchChanges(self, version):
        r = requests.post('http://ron.naezith.com/fetchChanges/', json={'version': version})
        actions = r.json()['changes']
        return actions


    def execActions(self, actions):
        for action in actions:
            path = str(action['path'])
            if action['action'] == 'remove':
                if os.path.isfile(path):
                    try:
                        os.remove(path)
                        print('Removed %s' %(path))
                    except:
                        print('Could not remove %s' %(path))
                        time.sleep(60)
                        sys.exit(-1)
                else:
                    print('%s does not exist, skipping' %(path))
            elif action['action'] == 'add':
                try:
                    dirs = path.split('/')
                    if len(dirs) > 1:
                        mkpath = '/'.join(dirs[:-1])
                        if not os.path.exists(mkpath):
                            os.makedirs(mkpath)
                            print(mkpath)
                    print('Downloading %s...' %(path))
                    r = requests.get('http://ron.naezith.com/files/Release/'+action['path'], stream=True)
                    with open(path,'wb') as dest:
                        for block in r:
                            dest.write(block)
                    dest.close()
                    print('Added %s' %(path))
                except:
                    print('Could not add %s' %(path))
                    time.sleep(60)
                    sys.exit(-1)


    def __init__(self, args):
        version = int(args[2])
        versionInServer = int(args[3])
        print('Updating from: %d to %d' % (version, versionInServer))
        actions = self.fetchChanges(version)
        self.execActions(actions)
        with open("data/version.rond",'w') as version_file:
            version_file.write(str(versionInServer))
        version_file.close()
        os.startfile('naezith.exe')

Patcher(sys.argv)
