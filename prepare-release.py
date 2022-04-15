import json
import argparse
import os
import string
import random
import base64
import sys
from git import Repo

version = sys.argv[1];

repo = Repo(os.getcwd())
assert not repo.bare

with open('system.json') as json_file:
    data = json.load(json_file)
    data['version'] = version
    
with open("system.json", "w") as fp:
    json.dump(data, fp, indent=4) 

repo.git.add("system.json")
repo.git.commit('-m', 'Release %s' % version, author='rughalt@gmail.com')

origin = repo.remote(name='origin')
origin.push()