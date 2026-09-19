from PIL import Image
import numpy as np
from scipy import ndimage

def cut_mask(rgb, tol=26):
    H,W,_=rgb.shape
    border=np.concatenate([rgb[0],rgb[-1],rgb[:,0],rgb[:,-1]])
    bg=np.median(border,axis=0)
    bgmask=np.abs(rgb-bg).max(axis=2)<tol
    lab,n=ndimage.label(bgmask)
    edge=set(lab[0].tolist())|set(lab[-1].tolist())|set(lab[:,0].tolist())|set(lab[:,-1].tolist())
    edge.discard(0)
    fg=~np.isin(lab,list(edge))
    fg=ndimage.binary_closing(fg,np.ones((5,5)))
    fg=ndimage.binary_fill_holes(fg)
    lab2,n2=ndimage.label(fg)
    if n2:
        sizes=ndimage.sum(fg,lab2,range(1,n2+1))
        fg=lab2==(int(np.argmax(sizes))+1)
    return fg

def metrics(path):
    rgb=np.asarray(Image.open(path).convert("RGB")).astype(np.int16)
    fg=cut_mask(rgb)
    ys,xs=np.nonzero(fg)
    if len(ys)==0: return None
    return dict(top=int(ys.min()),bot=int(ys.max()),l=int(xs.min()),r=int(xs.max()),
                h=int(ys.max()-ys.min()),w=int(xs.max()-xs.min()),area=int(fg.sum()))
