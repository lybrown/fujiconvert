>>> use warnings;
>>> %k = qw(
>>>   11 Help
>>>
>>>   1C Esc
>>>   1F 1
>>>   1E 2
>>>   1A 3
>>>   18 4
>>>   1D 5
>>>   1B 6
>>>   33 7
>>>   35 8
>>>   30 9
>>>   32 0
>>>   36 <
>>>   37 >
>>>   34 Bksp
>>>
>>>   2C Tab
>>>   2F Q
>>>   2E W
>>>   2A E
>>>   28 R
>>>   2D T
>>>   2B Y
>>>   0B U
>>>   0D I
>>>   08 O
>>>   0A P
>>>   0E -
>>>   0F =
>>>   08 Return
>>>
>>>   3F A
>>>   3E S
>>>   3A D
>>>   38 F
>>>   3D G
>>>   39 H
>>>   01 J
>>>   05 K
>>>   00 L
>>>   02 ;
>>>   06 +
>>>   07 *
>>>   3C Caps
>>>
>>>   17 Z
>>>   16 X
>>>   12 C
>>>   10 V
>>>   15 B
>>>   23 N
>>>   25 M
>>>   20 ,
>>>   22 .
>>>   26 /
>>>   27 Inv
>>>
>>>   21 Space
>>> );
>>>
>>> %map = (
>>> # finelevels, offset, pulse, pulsediff
>>>   "1" => [1,0,0,0],
>>>   "2" => [2,0,3,5],
>>>   "3" => [3,0,3,4],
>>>   "4" => [4,0,2,3],
>>>   "5" => [5,0,3,3],
>>>   "6" => [6,0,5,3],
>>>   "7" => [7,0,7,3],
>>>   "8" => [8,0,0,2],
>>>   "9" => [9,0,1,2],
>>>   "0" => [10,0,1,2],
>>>   "Q" => [11,0,2,2],
>>>   "W" => [12,0,2,2],
>>>   "E" => [13,0,3,2],
>>>   "R" => [14,0,3,2],
>>>   "T" => [15,0,4,2],
>>>   "Y" => [16,0,4,2],
>>>   "U" => [14,0,2,2],
>>>
>>>   "A" => [1,0,0,0],
>>>   "S" => [2,0,3,5],
>>>   "D" => [3,0,1,3],
>>>   "F" => [4,0,7,4],
>>>   "G" => [5,0,10,4],
>>>   "H" => [6,0,5,3],
>>>   "J" => [7,0,7,3],
>>>   "K" => [8,0,8,3],
>>>   "L" => [9,0,10,3],
>>>   ";" => [10,0,10,3],
>>>   "Z" => [11,0,13,3],
>>>   "X" => [12,0,16,3],
>>>   "C" => [13,0,17,3],
>>>   "V" => [14,0,17,3],
>>>   "B" => [15,0,17,3],
>>>   "N" => [16,0,15,3],
>>> );
>>> --$_->[0] for values %map;
>>>
>>> %rk = map {$k{$_} => hex $_} keys %k;
>>>
>>> $def = $map{R};
>>> @mem = map {($def->[$_]) x 64} 0 .. 3;
>>> for $m (keys %map) {
>>>   $mem[$rk{$m}+$_*0x40] = $map{$m}[$_] for 0 .. 3;
>>> }
>>> while (@mem) {
    dta <<<join ",", map {sprintf "%02d",$_} splice @mem,0,16>>>
>>> }