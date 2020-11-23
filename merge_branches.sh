#!/bin/sh

set -x

git remote add volto https://github.com/plone/volto.git
git fetch --all
git pull

# git merge volto/master
git merge volto/multi_block_copypaste
git merge volto/is_backend_resource
